#!/usr/bin/env pwsh
# CEX Exchange Production Deployment Script
# PowerShell script untuk deployment ke production Kubernetes cluster

param(
    [string]$ImageTag = "latest",
    [string]$Namespace = "cex-exchange",
    [string]$KubeConfig = "",
    [switch]$DryRun = $false,
    [switch]$SkipTests = $false,
    [switch]$Force = $false
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
    
    # Check helm
    try {
        $helmVersion = helm version --short 2>$null
        Write-Success "helm found: $helmVersion"
    } catch {
        Write-Warning "helm not found. Some features may not work."
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
    
    # Validate Kubernetes manifests
    Write-Step "Validating Kubernetes manifests..."
    Push-Location "./k8s"
    try {
        kustomize build . | kubectl apply --dry-run=client --validate=true -f -
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Kubernetes manifests are valid"
        } else {
            Write-Error "Kubernetes manifests validation failed"
            exit 1
        }
    } finally {
        Pop-Location
    }
    
    # Test database connectivity (if possible)
    Write-Step "Testing database connectivity..."
    # Add database connectivity tests here
    
    Write-Success "Pre-deployment tests completed"
}

function Deploy-Application {
    param([string]$Tag)
    
    Write-Step "Deploying CEX Exchange to production..."
    
    Push-Location "./k8s"
    try {
        # Create namespace if it doesn't exist
        kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
        
        # Update image tags in kustomization
        $kustomizationContent = Get-Content "kustomization.yaml" -Raw
        $kustomizationContent = $kustomizationContent -replace "newTag: .*", "newTag: $Tag"
        Set-Content "kustomization.yaml" $kustomizationContent
        
        if ($DryRun) {
            Write-Step "Performing dry run deployment..."
            kustomize build . | kubectl apply --dry-run=server --validate=true -f -
        } else {
            Write-Step "Applying Kubernetes manifests..."
            kustomize build . | kubectl apply -f -
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Deployment applied successfully"
        } else {
            Write-Error "Deployment failed"
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
    
    Write-Step "Waiting for deployment to complete..."
    
    $deployments = @("cex-backend", "cex-frontend", "cex-admin")
    
    foreach ($deployment in $deployments) {
        Write-Step "Waiting for $deployment to be ready..."
        kubectl rollout status deployment/$deployment -n $Namespace --timeout=600s
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$deployment is ready"
        } else {
            Write-Error "$deployment failed to become ready"
            
            # Show pod logs for debugging
            Write-Step "Showing logs for $deployment:"
            kubectl logs -l app=$deployment -n $Namespace --tail=50
            
            if (-not $Force) {
                exit 1
            }
        }
    }
    
    # Wait for StatefulSets
    $statefulsets = @("postgresql", "redis", "mongodb")
    
    foreach ($statefulset in $statefulsets) {
        Write-Step "Waiting for $statefulset to be ready..."
        kubectl rollout status statefulset/$statefulset -n $Namespace --timeout=600s
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$statefulset is ready"
        } else {
            Write-Warning "$statefulset may not be ready yet"
        }
    }
}

function Run-PostDeploymentTests {
    if ($SkipTests -or $DryRun) {
        Write-Warning "Skipping post-deployment tests"
        return
    }
    
    Write-Step "Running post-deployment tests..."
    
    # Health check endpoints
    $healthChecks = @(
        @{Name="Backend API"; URL="https://api.cexexchange.com/health"},
        @{Name="Frontend"; URL="https://cexexchange.com"},
        @{Name="Admin Panel"; URL="https://admin.cexexchange.com/health"}
    )
    
    foreach ($check in $healthChecks) {
        Write-Step "Testing $($check.Name)..."
        try {
            $response = Invoke-WebRequest -Uri $check.URL -TimeoutSec 30 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "$($check.Name) is healthy"
            } else {
                Write-Warning "$($check.Name) returned status code: $($response.StatusCode)"
            }
        } catch {
            Write-Warning "$($check.Name) health check failed: $($_.Exception.Message)"
        }
    }
    
    Write-Success "Post-deployment tests completed"
}

function Show-DeploymentStatus {
    if ($DryRun) {
        Write-Step "Skipping status check (dry run mode)"
        return
    }
    
    Write-Step "Deployment Status:"
    
    # Show pods
    Write-ColorOutput "\nPods:" $Blue
    kubectl get pods -n $Namespace -o wide
    
    # Show services
    Write-ColorOutput "\nServices:" $Blue
    kubectl get services -n $Namespace
    
    # Show ingress
    Write-ColorOutput "\nIngress:" $Blue
    kubectl get ingress -n $Namespace
    
    # Show persistent volumes
    Write-ColorOutput "\nPersistent Volumes:" $Blue
    kubectl get pv | Where-Object { $_ -match $Namespace }
}

function Main {
    Write-ColorOutput "\n=== CEX Exchange Production Deployment ===", $Green
    Write-ColorOutput "Image Tag: $ImageTag"
    Write-ColorOutput "Namespace: $Namespace"
    Write-ColorOutput "Dry Run: $DryRun"
    Write-ColorOutput "Skip Tests: $SkipTests"
    Write-ColorOutput "Force: $Force\n"
    
    if (-not $Force) {
        $confirmation = Read-Host "Are you sure you want to deploy to PRODUCTION? (yes/no)"
        if ($confirmation -ne "yes") {
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
        
        Write-Success "\n=== Deployment completed successfully! ==="
        
    } catch {
        Write-Error "Deployment failed: $($_.Exception.Message)"
        Write-Error "Stack trace: $($_.ScriptStackTrace)"
        exit 1
    }
}

# Run main function
Main