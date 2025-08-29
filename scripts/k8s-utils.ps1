#!/usr/bin/env pwsh
# CEX Exchange Kubernetes Utilities Script
# PowerShell script untuk manajemen dan troubleshooting Kubernetes cluster

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "logs", "restart", "scale", "backup", "restore", "cleanup", "monitor", "debug", "update-secrets", "port-forward")]
    [string]$Action,
    
    [string]$Namespace = "cex-exchange",
    [string]$Component = "",
    [string]$Replicas = "1",
    [string]$BackupName = "",
    [string]$LogLines = "100",
    [string]$Port = "3000",
    [switch]$Follow = $false,
    [switch]$Production = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = $Reset
    )
    Write-Host "${Color}${Message}${Reset}"
}

function Write-Header {
    param([string]$Message)
    Write-ColorOutput "\n=== $Message ===" $Cyan
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" $Blue
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

function Get-ClusterStatus {
    Write-Header "Cluster Status for $Namespace"
    
    # Cluster info
    Write-Step "Cluster Information:"
    kubectl cluster-info
    
    # Namespace status
    Write-Step "\nNamespace Status:"
    kubectl get namespace $Namespace -o wide
    
    # Nodes status
    Write-Step "\nNodes Status:"
    kubectl get nodes -o wide
    
    # Pods status
    Write-Step "\nPods Status:"
    kubectl get pods -n $Namespace -o wide
    
    # Services status
    Write-Step "\nServices Status:"
    kubectl get services -n $Namespace -o wide
    
    # Ingress status
    Write-Step "\nIngress Status:"
    kubectl get ingress -n $Namespace -o wide
    
    # PVC status
    Write-Step "\nPersistent Volume Claims:"
    kubectl get pvc -n $Namespace -o wide
    
    # ConfigMaps and Secrets
    Write-Step "\nConfigMaps:"
    kubectl get configmaps -n $Namespace
    
    Write-Step "\nSecrets:"
    kubectl get secrets -n $Namespace
    
    # Resource usage
    Write-Step "\nResource Usage:"
    kubectl top nodes 2>$null
    kubectl top pods -n $Namespace 2>$null
    
    # Recent events
    Write-Step "\nRecent Events:"
    kubectl get events -n $Namespace --sort-by='.lastTimestamp' | Select-Object -Last 10
}

function Get-ComponentLogs {
    param(
        [string]$ComponentName,
        [string]$Lines,
        [bool]$FollowLogs
    )
    
    if (-not $ComponentName) {
        Write-Error "Component name is required for logs action"
        return
    }
    
    Write-Header "Logs for $ComponentName"
    
    $followFlag = if ($FollowLogs) { "-f" } else { "" }
    
    try {
        # Get pods for the component
        $pods = kubectl get pods -n $Namespace -l app=$ComponentName -o jsonpath='{.items[*].metadata.name}'
        
        if (-not $pods) {
            Write-Warning "No pods found for component: $ComponentName"
            return
        }
        
        $podList = $pods -split ' '
        
        foreach ($pod in $podList) {
            Write-Step "Logs from pod: $pod"
            kubectl logs $pod -n $Namespace --tail=$Lines $followFlag
            Write-ColorOutput "\n" + "-" * 80 + "\n" $Yellow
        }
    } catch {
        Write-Error "Failed to get logs: $($_.Exception.Message)"
    }
}

function Restart-Component {
    param([string]$ComponentName)
    
    if (-not $ComponentName) {
        Write-Error "Component name is required for restart action"
        return
    }
    
    Write-Header "Restarting $ComponentName"
    
    try {
        # Check if it's a deployment or statefulset
        $deployment = kubectl get deployment $ComponentName -n $Namespace 2>$null
        $statefulset = kubectl get statefulset $ComponentName -n $Namespace 2>$null
        
        if ($deployment) {
            Write-Step "Restarting deployment: $ComponentName"
            kubectl rollout restart deployment/$ComponentName -n $Namespace
            kubectl rollout status deployment/$ComponentName -n $Namespace --timeout=300s
        } elseif ($statefulset) {
            Write-Step "Restarting statefulset: $ComponentName"
            kubectl rollout restart statefulset/$ComponentName -n $Namespace
            kubectl rollout status statefulset/$ComponentName -n $Namespace --timeout=300s
        } else {
            Write-Error "Component $ComponentName not found as deployment or statefulset"
            return
        }
        
        Write-Success "$ComponentName restarted successfully"
    } catch {
        Write-Error "Failed to restart $ComponentName: $($_.Exception.Message)"
    }
}

function Scale-Component {
    param(
        [string]$ComponentName,
        [string]$ReplicaCount
    )
    
    if (-not $ComponentName) {
        Write-Error "Component name is required for scale action"
        return
    }
    
    Write-Header "Scaling $ComponentName to $ReplicaCount replicas"
    
    try {
        kubectl scale deployment/$ComponentName --replicas=$ReplicaCount -n $Namespace
        kubectl rollout status deployment/$ComponentName -n $Namespace --timeout=300s
        
        Write-Success "$ComponentName scaled to $ReplicaCount replicas successfully"
    } catch {
        Write-Error "Failed to scale $ComponentName: $($_.Exception.Message)"
    }
}

function Backup-Data {
    param([string]$BackupName)
    
    if (-not $BackupName) {
        $BackupName = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    }
    
    Write-Header "Creating backup: $BackupName"
    
    try {
        # Trigger backup job
        $backupJob = @"
apiVersion: batch/v1
kind: Job
metadata:
  name: manual-backup-$(Get-Date -Format 'yyyyMMddHHmmss')
  namespace: $Namespace
spec:
  template:
    spec:
      containers:
      - name: backup
        image: cexexchange/backup-tools:latest
        env:
        - name: BACKUP_NAME
          value: "$BackupName"
        - name: BACKUP_TYPE
          value: "manual"
        volumeMounts:
        - name: backup-storage
          mountPath: /backups
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: backup-pvc
      restartPolicy: Never
  backoffLimit: 3
"@
        
        $backupJob | kubectl apply -f -
        
        Write-Success "Backup job created: $BackupName"
        Write-Step "Monitor backup progress with: kubectl logs -f job/manual-backup-* -n $Namespace"
    } catch {
        Write-Error "Failed to create backup: $($_.Exception.Message)"
    }
}

function Restore-Data {
    param([string]$BackupName)
    
    if (-not $BackupName) {
        Write-Error "Backup name is required for restore action"
        return
    }
    
    Write-Header "Restoring from backup: $BackupName"
    Write-Warning "This will restore data and may cause downtime!"
    
    $confirmation = Read-Host "Are you sure you want to restore from $BackupName? (yes/no)"
    if ($confirmation -ne "yes") {
        Write-Warning "Restore cancelled"
        return
    }
    
    try {
        # Create restore job
        $restoreJob = @"
apiVersion: batch/v1
kind: Job
metadata:
  name: manual-restore-$(Get-Date -Format 'yyyyMMddHHmmss')
  namespace: $Namespace
spec:
  template:
    spec:
      containers:
      - name: restore
        image: cexexchange/backup-tools:latest
        env:
        - name: BACKUP_NAME
          value: "$BackupName"
        - name: RESTORE_TYPE
          value: "manual"
        volumeMounts:
        - name: backup-storage
          mountPath: /backups
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: backup-pvc
      restartPolicy: Never
  backoffLimit: 1
"@
        
        $restoreJob | kubectl apply -f -
        
        Write-Success "Restore job created for: $BackupName"
        Write-Step "Monitor restore progress with: kubectl logs -f job/manual-restore-* -n $Namespace"
    } catch {
        Write-Error "Failed to create restore job: $($_.Exception.Message)"
    }
}

function Cleanup-Resources {
    Write-Header "Cleaning up resources in $Namespace"
    
    try {
        # Clean up completed jobs
        Write-Step "Cleaning up completed jobs..."
        kubectl delete jobs -n $Namespace --field-selector=status.successful=1
        
        # Clean up failed jobs older than 1 day
        Write-Step "Cleaning up old failed jobs..."
        $oneDayAgo = (Get-Date).AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ssZ")
        kubectl get jobs -n $Namespace -o json | ConvertFrom-Json | ForEach-Object {
            $_.items | Where-Object {
                $_.status.failed -and $_.metadata.creationTimestamp -lt $oneDayAgo
            } | ForEach-Object {
                kubectl delete job $_.metadata.name -n $Namespace
            }
        }
        
        # Clean up old replica sets
        Write-Step "Cleaning up old replica sets..."
        kubectl delete replicaset -n $Namespace --field-selector='status.replicas=0'
        
        # Clean up evicted pods
        Write-Step "Cleaning up evicted pods..."
        kubectl get pods -n $Namespace --field-selector=status.phase=Failed -o json | ConvertFrom-Json | ForEach-Object {
            $_.items | Where-Object {
                $_.status.reason -eq "Evicted"
            } | ForEach-Object {
                kubectl delete pod $_.metadata.name -n $Namespace
            }
        }
        
        Write-Success "Cleanup completed"
    } catch {
        Write-Error "Cleanup failed: $($_.Exception.Message)"
    }
}

function Monitor-Resources {
    Write-Header "Resource Monitoring for $Namespace"
    
    try {
        # CPU and Memory usage
        Write-Step "Resource Usage:"
        kubectl top pods -n $Namespace --sort-by=cpu
        
        # Storage usage
        Write-Step "\nStorage Usage:"
        kubectl get pvc -n $Namespace -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,VOLUME:.spec.volumeName,CAPACITY:.status.capacity.storage,STORAGECLASS:.spec.storageClassName
        
        # Network policies
        Write-Step "\nNetwork Policies:"
        kubectl get networkpolicies -n $Namespace
        
        # Service endpoints
        Write-Step "\nService Endpoints:"
        kubectl get endpoints -n $Namespace
        
        # Pod disruption budgets
        Write-Step "\nPod Disruption Budgets:"
        kubectl get pdb -n $Namespace
        
        # Horizontal Pod Autoscalers
        Write-Step "\nHorizontal Pod Autoscalers:"
        kubectl get hpa -n $Namespace
        
    } catch {
        Write-Error "Monitoring failed: $($_.Exception.Message)"
    }
}

function Debug-Component {
    param([string]$ComponentName)
    
    if (-not $ComponentName) {
        Write-Error "Component name is required for debug action"
        return
    }
    
    Write-Header "Debugging $ComponentName"
    
    try {
        # Get pod details
        Write-Step "Pod Details:"
        kubectl describe pods -l app=$ComponentName -n $Namespace
        
        # Get recent logs
        Write-Step "\nRecent Logs:"
        kubectl logs -l app=$ComponentName -n $Namespace --tail=50
        
        # Get events related to the component
        Write-Step "\nRelated Events:"
        kubectl get events -n $Namespace --field-selector involvedObject.name=$ComponentName
        
        # Check resource usage
        Write-Step "\nResource Usage:"
        kubectl top pods -l app=$ComponentName -n $Namespace
        
        # Check service endpoints
        Write-Step "\nService Endpoints:"
        kubectl get endpoints -l app=$ComponentName -n $Namespace
        
    } catch {
        Write-Error "Debug failed: $($_.Exception.Message)"
    }
}

function Update-Secrets {
    Write-Header "Updating Secrets in $Namespace"
    
    Write-Warning "This will update sensitive configuration. Proceed with caution!"
    $confirmation = Read-Host "Continue with secret update? (yes/no)"
    if ($confirmation -ne "yes") {
        Write-Warning "Secret update cancelled"
        return
    }
    
    try {
        # Apply secrets from file
        kubectl apply -f ../k8s/secrets.yaml -n $Namespace
        
        # Restart deployments to pick up new secrets
        $deployments = @("cex-backend", "cex-frontend", "cex-admin")
        foreach ($deployment in $deployments) {
            Write-Step "Restarting $deployment to pick up new secrets..."
            kubectl rollout restart deployment/$deployment -n $Namespace
        }
        
        Write-Success "Secrets updated and deployments restarted"
    } catch {
        Write-Error "Failed to update secrets: $($_.Exception.Message)"
    }
}

function Port-Forward {
    param(
        [string]$ComponentName,
        [string]$LocalPort
    )
    
    if (-not $ComponentName) {
        Write-Error "Component name is required for port-forward action"
        return
    }
    
    Write-Header "Port forwarding for $ComponentName"
    
    try {
        # Get the first pod for the component
        $pod = kubectl get pods -n $Namespace -l app=$ComponentName -o jsonpath='{.items[0].metadata.name}'
        
        if (-not $pod) {
            Write-Error "No pods found for component: $ComponentName"
            return
        }
        
        Write-Step "Port forwarding from localhost:$LocalPort to $pod:$Port"
        Write-Step "Access the service at: http://localhost:$LocalPort"
        Write-Step "Press Ctrl+C to stop port forwarding"
        
        kubectl port-forward pod/$pod -n $Namespace "${LocalPort}:${Port}"
        
    } catch {
        Write-Error "Port forwarding failed: $($_.Exception.Message)"
    }
}

function Main {
    # Set namespace based on production flag
    if ($Production) {
        $Namespace = "cex-exchange"
    } elseif ($Namespace -eq "cex-exchange") {
        $Namespace = "cex-exchange-staging"
    }
    
    Write-ColorOutput "CEX Exchange Kubernetes Utilities" $Cyan
    Write-ColorOutput "Action: $Action"
    Write-ColorOutput "Namespace: $Namespace"
    Write-ColorOutput "Component: $Component\n"
    
    switch ($Action) {
        "status" { Get-ClusterStatus }
        "logs" { Get-ComponentLogs -ComponentName $Component -Lines $LogLines -FollowLogs $Follow }
        "restart" { Restart-Component -ComponentName $Component }
        "scale" { Scale-Component -ComponentName $Component -ReplicaCount $Replicas }
        "backup" { Backup-Data -BackupName $BackupName }
        "restore" { Restore-Data -BackupName $BackupName }
        "cleanup" { Cleanup-Resources }
        "monitor" { Monitor-Resources }
        "debug" { Debug-Component -ComponentName $Component }
        "update-secrets" { Update-Secrets }
        "port-forward" { Port-Forward -ComponentName $Component -LocalPort $Port }
        default { Write-Error "Unknown action: $Action" }
    }
}

# Run main function
Main