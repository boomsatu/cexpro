#!/usr/bin/env pwsh
# CEX Exchange Staging Deployment Script
# PowerShell script untuk deployment ke staging Kubernetes cluster

param(
    [string]$ImageTag = "staging",
    [string]$Namespace = "cex-exchange-staging",
    [string]$KubeConfig = "",
    [switch]$DryRun = $false,
    [switch]$SkipTests = $false,
    [switch]$AutoApprove = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = $Reset
    )
    Write-Host "${Color}${Message}${Reset}"
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "[STEP] $Message" $Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" $Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" $Red
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    # Check kubectl
    try {
        $kubectlVersion = kubectl version --client --short 2>$null
        Write-Success "kubectl found: $kubectlVersion"
    } catch {
        Write-Error "kubectl not found. Please install kubectl."
        exit 1
    }
    
    # Check kustomize
    try {
        $kustomizeVersion = kustomize version --short 2>$null
        Write-Success "kustomize found: $kustomizeVersion"
    } catch {
        Write-Error "kustomize not found. Please install kustomize."
        exit 1
    }
    
    # Check docker
    try {
        $dockerVersion = docker --version 2>$null
        Write-Success "docker found: $dockerVersion"
    } catch {
        Write-Warning "docker not found. Image building will be skipped."
    }
}

function Test-ClusterConnection {
    Write-Step "Testing cluster connection..."
    
    if ($KubeConfig) {
        $env:KUBECONFIG = $KubeConfig
    }
    
    try {
        $clusterInfo = kubectl cluster-info --request-timeout=10s 2>$null
        Write-Success "Connected to Kubernetes cluster"
        
        # Check if namespace exists
        $namespaceExists = kubectl get namespace $Namespace 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Namespace '$Namespace' exists"
        } else {
            Write-Warning "Namespace '$Namespace' does not exist. It will be created."
        }
    } catch {
        Write-Error "Failed to connect to Kubernetes cluster"
        exit 1
    }
}

function Build-Images {
    param([string]$Tag)
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Warning "Docker not available. Skipping image build."
        return
    }
    
    Write-Step "Building Docker images with tag: $Tag"
    
    $images = @(
        @{Name="cex-backend"; Path="./backend"},
        @{Name="cex-frontend"; Path="./frontend"},
        @{Name="cex-admin"; Path="./admin-panel"}
    )
    
    foreach ($image in $images) {
        Write-Step "Building $($image.Name)..."
        
        Push-Location $image.Path
        try {
            docker build -t "ghcr.io/cexexchange/$($image.Name):$Tag" .
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Built $($image.Name) successfully"
                
                # Push to registry
                Write-Step "Pushing $($image.Name) to registry..."
                docker push "ghcr.io/cexexchange/$($image.Name):$Tag"
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Pushed $($image.Name) successfully"
                } else {
                    Write-Error "Failed to push $($image.Name)"
                    exit 1
                }
            } else {
                Write-Error "Failed to build $($image.Name)"
                exit 1
            }
        } finally {
            Pop-Location
        }
    }
}

function Run-PreDeploymentTests {
    if ($SkipTests) {
        Write-Warning "Skipping pre-deployment tests"
        return
    }
    
    Write-Step "Running pre-deployment tests..."
    
    # Validate Kubernetes manifests for staging
    Write-Step "Validating Kubernetes manifests for staging..."
    Push-Location "./k8s"
    try {
        # Use staging kustomization
        $stagingKustomization = @"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: $Namespace

resources:
  - namespace.yaml
  - configmap.yaml
  - secrets.yaml
  - storage.yaml
  - ingress.yaml
  - database-deployment.yaml
  - backend-deployment.yaml
  - frontend-deployment.yaml
  - admin-deployment.yaml
  - monitoring.yaml
  - logging.yaml
  - security.yaml

images:
  - name: cex-backend
    newName: ghcr.io/cexexchange/backend
    newTag: $ImageTag
  - name: cex-frontend
    newName: ghcr.io/cexexchange/frontend
    newTag: $ImageTag
  - name: cex-admin
    newName: ghcr.io/cexexchange/admin
    newTag: $ImageTag

patchesStrategicMerge:
  - patches/staging-resources.yaml
  - patches/staging-replicas.yaml

commonLabels:
  environment: staging
"@
        
        Set-Content "kustomization-staging.yaml" $stagingKustomization
        
        kustomize build . -o staging-manifests.yaml
        kubectl apply --dry-run=client --validate=true -f staging-manifests.yaml
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Kubernetes manifests are valid for staging"
        } else {
            Write-Error "Kubernetes manifests validation failed for staging"
            exit 1
        }
    } finally {
        Pop-Location
    }
    
    Write-Success "Pre-deployment tests completed"
}

function Deploy-Application {
    param([string]$Tag)
    
    Write-Step "Deploying CEX Exchange to staging..."
    
    Push-Location "./k8s"
    try {
        # Create namespace if it doesn't exist
        kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
        
        # Apply staging-specific labels
        kubectl label namespace $Namespace environment=staging --overwrite
        
        if ($DryRun) {
            Write-Step "Performing dry run deployment..."
            kubectl apply --dry-run=server --validate=true -f staging-manifests.yaml
        } else {
            Write-Step "Applying Kubernetes manifests for staging..."
            kubectl apply -f staging-manifests.yaml
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Staging deployment applied successfully"
        } else {
            Write-Error "Staging deployment failed"
            exit 1
        }
    } finally {
        Pop-Location
    }
}

function Wait-ForDeployment {
    if ($DryRun) {
        Write-Step "Skipping deployment wait (dry run mode)"
        return
    }
    
    Write-Step "Waiting for staging deployment to complete..."
    
    $deployments = @("cex-backend", "cex-frontend", "cex-admin")
    
    foreach ($deployment in $deployments) {
        Write-Step "Waiting for $deployment to be ready..."
        kubectl rollout status deployment/$deployment -n $Namespace --timeout=300s
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$deployment is ready"
        } else {
            Write-Warning "$deployment may not be ready yet"
            
            # Show pod logs for debugging
            Write-Step "Showing logs for $deployment:"
            kubectl logs -l app=$deployment -n $Namespace --tail=20
        }
    }
    
    # Wait for StatefulSets (with shorter timeout for staging)
    $statefulsets = @("postgresql", "redis", "mongodb")
    
    foreach ($statefulset in $statefulsets) {
        Write-Step "Waiting for $statefulset to be ready..."
        kubectl rollout status statefulset/$statefulset -n $Namespace --timeout=300s
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$statefulset is ready"
        } else {
            Write-Warning "$statefulset may not be ready yet (this is normal for staging)"
        }
    }
}

function Run-PostDeploymentTests {
    if ($SkipTests -or $DryRun) {
        Write-Warning "Skipping post-deployment tests"
        return
    }
    
    Write-Step "Running post-deployment tests for staging..."
    
    # Health check endpoints for staging
    $healthChecks = @(
        @{Name="Backend API"; URL="https://staging-api.cexexchange.com/health"},
        @{Name="Frontend"; URL="https://staging.cexexchange.com"},
        @{Name="Admin Panel"; URL="https://staging-admin.cexexchange.com/health"}
    )
    
    foreach ($check in $healthChecks) {
        Write-Step "Testing $($check.Name)..."
        try {
            $response = Invoke-WebRequest -Uri $check.URL -TimeoutSec 15 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "$($check.Name) is healthy"
            } else {
                Write-Warning "$($check.Name) returned status code: $($response.StatusCode)"
            }
        } catch {
            Write-Warning "$($check.Name) health check failed: $($_.Exception.Message)"
        }
    }
    
    # Run basic API tests
    Write-Step "Running basic API tests..."
    try {
        # Test public endpoints
        $apiTests = @(
            @{Name="Market Data"; Endpoint="/api/v1/markets"},
            @{Name="System Status"; Endpoint="/api/v1/status"},
            @{Name="Public Stats"; Endpoint="/api/v1/stats"}
        )
        
        foreach ($test in $apiTests) {
            $url = "https://staging-api.cexexchange.com$($test.Endpoint)"
            try {
                $response = Invoke-RestMethod -Uri $url -TimeoutSec 10
                Write-Success "$($test.Name) API test passed"
            } catch {
                Write-Warning "$($test.Name) API test failed: $($_.Exception.Message)"
            }
        }
    } catch {
        Write-Warning "API tests failed: $($_.Exception.Message)"
    }
    
    Write-Success "Post-deployment tests completed"
}

function Show-DeploymentStatus {
    if ($DryRun) {
        Write-Step "Skipping status check (dry run mode)"
        return
    }
    
    Write-Step "Staging Deployment Status:"
    
    # Show pods
    Write-ColorOutput "\nPods:" $Blue
    kubectl get pods -n $Namespace -o wide
    
    # Show services
    Write-ColorOutput "\nServices:" $Blue
    kubectl get services -n $Namespace
    
    # Show ingress
    Write-ColorOutput "\nIngress:" $Blue
    kubectl get ingress -n $Namespace
    
    # Show resource usage
    Write-ColorOutput "\nResource Usage:" $Blue
    kubectl top pods -n $Namespace 2>$null
    
    # Show recent events
    Write-ColorOutput "\nRecent Events:" $Blue
    kubectl get events -n $Namespace --sort-by='.lastTimestamp' | Select-Object -Last 10
}

function Cleanup-OldDeployments {
    Write-Step "Cleaning up old staging deployments..."
    
    try {
        # Clean up old ReplicaSets
        kubectl delete replicaset -n $Namespace -l app=cex-backend --field-selector='status.replicas=0'
        kubectl delete replicaset -n $Namespace -l app=cex-frontend --field-selector='status.replicas=0'
        kubectl delete replicaset -n $Namespace -l app=cex-admin --field-selector='status.replicas=0'
        
        Write-Success "Old deployments cleaned up"
    } catch {
        Write-Warning "Failed to clean up old deployments: $($_.Exception.Message)"
    }
}

function Main {
    Write-ColorOutput "\n=== CEX Exchange Staging Deployment ===" $Green
    Write-ColorOutput "Image Tag: $ImageTag"
    Write-ColorOutput "Namespace: $Namespace"
    Write-ColorOutput "Dry Run: $DryRun"
    Write-ColorOutput "Skip Tests: $SkipTests"
    Write-ColorOutput "Auto Approve: $AutoApprove\n"
    
    if (-not $AutoApprove -and -not $DryRun) {
        $confirmation = Read-Host "Deploy to staging environment? (y/n)"
        if ($confirmation -ne "y" -and $confirmation -ne "yes") {
            Write-Warning "Deployment cancelled"
            exit 0
        }
    }
    
    try {
        Test-Prerequisites
        Test-ClusterConnection
        
        if (-not $DryRun) {
            Build-Images -Tag $ImageTag
        }
        
        Run-PreDeploymentTests
        Deploy-Application -Tag $ImageTag
        Wait-ForDeployment
        Run-PostDeploymentTests
        Show-DeploymentStatus
        Cleanup-OldDeployments
        
        Write-Success "\n=== Staging deployment completed successfully! ==="
        Write-ColorOutput "\nStaging URLs:"
        Write-ColorOutput "- Frontend: https://staging.cexexchange.com" $Blue
        Write-ColorOutput "- API: https://staging-api.cexexchange.com" $Blue
        Write-ColorOutput "- Admin: https://staging-admin.cexexchange.com" $Blue
        
    } catch {
        Write-Error "Staging deployment failed: $($_.Exception.Message)"
        Write-Error "Stack trace: $($_.ScriptStackTrace)"
        
        # Show debugging information
        Write-Step "Debugging information:"
        kubectl get pods -n $Namespace
        kubectl get events -n $Namespace --sort-by='.lastTimestamp' | Select-Object -Last 5
        
        exit 1
    }
}

# Run main function
Main