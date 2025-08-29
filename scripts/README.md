# CEX Exchange Deployment Scripts

Kumpulan script PowerShell untuk deployment dan manajemen CEX Exchange di Kubernetes cluster.

## Prerequisites

Sebelum menggunakan script ini, pastikan Anda telah menginstall:

- **kubectl** - Kubernetes command-line tool
- **kustomize** - Kubernetes configuration management tool
- **helm** (opsional) - Kubernetes package manager
- **docker** - Container runtime untuk building images
- **PowerShell 7+** - Cross-platform PowerShell

## Script Overview

### 1. deploy-production.ps1

Script untuk deployment ke production environment.

```powershell
# Basic deployment
.\deploy-production.ps1 -ImageTag "v1.0.0"

# Dry run deployment
.\deploy-production.ps1 -ImageTag "v1.0.0" -DryRun

# Skip tests and force deployment
.\deploy-production.ps1 -ImageTag "v1.0.0" -SkipTests -Force

# Custom namespace and kubeconfig
.\deploy-production.ps1 -ImageTag "v1.0.0" -Namespace "custom-namespace" -KubeConfig "path/to/kubeconfig"
```

**Parameters:**
- `-ImageTag`: Tag untuk Docker images (default: "latest")
- `-Namespace`: Kubernetes namespace (default: "cex-exchange")
- `-KubeConfig`: Path ke kubeconfig file
- `-DryRun`: Perform dry run without actual deployment
- `-SkipTests`: Skip pre/post deployment tests
- `-Force`: Skip confirmation prompts

### 2. deploy-staging.ps1

Script untuk deployment ke staging environment.

```powershell
# Basic staging deployment
.\deploy-staging.ps1

# Deploy specific version
.\deploy-staging.ps1 -ImageTag "feature-branch"

# Auto-approve deployment
.\deploy-staging.ps1 -AutoApprove

# Dry run with custom namespace
.\deploy-staging.ps1 -DryRun -Namespace "custom-staging"
```

**Parameters:**
- `-ImageTag`: Tag untuk Docker images (default: "staging")
- `-Namespace`: Kubernetes namespace (default: "cex-exchange-staging")
- `-KubeConfig`: Path ke kubeconfig file
- `-DryRun`: Perform dry run without actual deployment
- `-SkipTests`: Skip pre/post deployment tests
- `-AutoApprove`: Skip confirmation prompts

### 3. k8s-utils.ps1

Script utilitas untuk manajemen dan troubleshooting Kubernetes cluster.

```powershell
# Check cluster status
.\k8s-utils.ps1 -Action "status"

# View logs for specific component
.\k8s-utils.ps1 -Action "logs" -Component "cex-backend" -LogLines "200"

# Follow logs in real-time
.\k8s-utils.ps1 -Action "logs" -Component "cex-backend" -Follow

# Restart a component
.\k8s-utils.ps1 -Action "restart" -Component "cex-backend"

# Scale a component
.\k8s-utils.ps1 -Action "scale" -Component "cex-backend" -Replicas "5"

# Create backup
.\k8s-utils.ps1 -Action "backup" -BackupName "manual-backup-20240101"

# Restore from backup
.\k8s-utils.ps1 -Action "restore" -BackupName "manual-backup-20240101"

# Cleanup old resources
.\k8s-utils.ps1 -Action "cleanup"

# Monitor resources
.\k8s-utils.ps1 -Action "monitor"

# Debug component issues
.\k8s-utils.ps1 -Action "debug" -Component "cex-backend"

# Update secrets
.\k8s-utils.ps1 -Action "update-secrets"

# Port forward to local machine
.\k8s-utils.ps1 -Action "port-forward" -Component "cex-backend" -Port "8080"

# Use production namespace
.\k8s-utils.ps1 -Action "status" -Production
```

**Available Actions:**
- `status`: Show cluster and application status
- `logs`: View component logs
- `restart`: Restart a component
- `scale`: Scale component replicas
- `backup`: Create data backup
- `restore`: Restore from backup
- `cleanup`: Clean up old resources
- `monitor`: Monitor resource usage
- `debug`: Debug component issues
- `update-secrets`: Update Kubernetes secrets
- `port-forward`: Forward ports to local machine

**Parameters:**
- `-Action`: Action to perform (required)
- `-Namespace`: Kubernetes namespace (default: "cex-exchange-staging")
- `-Component`: Component name for specific actions
- `-Replicas`: Number of replicas for scaling
- `-BackupName`: Backup name for backup/restore operations
- `-LogLines`: Number of log lines to show (default: "100")
- `-Port`: Port number for port forwarding (default: "3000")
- `-Follow`: Follow logs in real-time
- `-Production`: Use production namespace

## Deployment Workflow

### Production Deployment

1. **Pre-deployment Checklist:**
   - Ensure all tests pass in staging
   - Review changes and get approval
   - Backup current production data
   - Schedule maintenance window if needed

2. **Deployment Steps:**
   ```powershell
   # 1. Create backup
   .\k8s-utils.ps1 -Action "backup" -BackupName "pre-deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Production
   
   # 2. Deploy to production
   .\deploy-production.ps1 -ImageTag "v1.0.0"
   
   # 3. Monitor deployment
   .\k8s-utils.ps1 -Action "monitor" -Production
   
   # 4. Check status
   .\k8s-utils.ps1 -Action "status" -Production
   ```

3. **Post-deployment:**
   - Verify all services are healthy
   - Run smoke tests
   - Monitor logs and metrics
   - Update documentation

### Staging Deployment

1. **Continuous Deployment:**
   ```powershell
   # Deploy latest changes to staging
   .\deploy-staging.ps1 -AutoApprove
   
   # Monitor deployment
   .\k8s-utils.ps1 -Action "monitor"
   
   # Check logs if issues occur
   .\k8s-utils.ps1 -Action "logs" -Component "cex-backend" -Follow
   ```

## Troubleshooting

### Common Issues

1. **Pod Not Starting:**
   ```powershell
   # Debug the component
   .\k8s-utils.ps1 -Action "debug" -Component "cex-backend"
   
   # Check recent logs
   .\k8s-utils.ps1 -Action "logs" -Component "cex-backend" -LogLines "500"
   ```

2. **High Resource Usage:**
   ```powershell
   # Monitor resources
   .\k8s-utils.ps1 -Action "monitor"
   
   # Scale up if needed
   .\k8s-utils.ps1 -Action "scale" -Component "cex-backend" -Replicas "5"
   ```

3. **Database Connection Issues:**
   ```powershell
   # Check database pods
   .\k8s-utils.ps1 -Action "debug" -Component "postgresql"
   
   # Restart database if needed
   .\k8s-utils.ps1 -Action "restart" -Component "postgresql"
   ```

4. **Configuration Issues:**
   ```powershell
   # Update secrets
   .\k8s-utils.ps1 -Action "update-secrets"
   
   # Restart affected components
   .\k8s-utils.ps1 -Action "restart" -Component "cex-backend"
   ```

### Emergency Procedures

1. **Rollback Deployment:**
   ```powershell
   # Rollback to previous version
   kubectl rollout undo deployment/cex-backend -n cex-exchange
   
   # Check rollback status
   kubectl rollout status deployment/cex-backend -n cex-exchange
   ```

2. **Scale Down for Maintenance:**
   ```powershell
   # Scale down all components
   .\k8s-utils.ps1 -Action "scale" -Component "cex-backend" -Replicas "0"
   .\k8s-utils.ps1 -Action "scale" -Component "cex-frontend" -Replicas "0"
   .\k8s-utils.ps1 -Action "scale" -Component "cex-admin" -Replicas "0"
   ```

3. **Emergency Restore:**
   ```powershell
   # Restore from latest backup
   .\k8s-utils.ps1 -Action "restore" -BackupName "latest-backup-name"
   ```

## Security Considerations

1. **Access Control:**
   - Ensure proper RBAC is configured
   - Use separate kubeconfig files for different environments
   - Rotate access keys regularly

2. **Secrets Management:**
   - Never commit secrets to version control
   - Use Kubernetes secrets or external secret management
   - Regularly update and rotate secrets

3. **Network Security:**
   - Configure network policies
   - Use TLS for all communications
   - Implement proper ingress controls

## Monitoring and Alerting

1. **Key Metrics to Monitor:**
   - Pod CPU and memory usage
   - Database connection pools
   - API response times
   - Error rates
   - Trading volume and latency

2. **Alert Conditions:**
   - Pod restart loops
   - High error rates
   - Database connection failures
   - Disk space usage > 80%
   - Memory usage > 90%

3. **Monitoring Commands:**
   ```powershell
   # Continuous monitoring
   .\k8s-utils.ps1 -Action "monitor"
   
   # Real-time logs
   .\k8s-utils.ps1 -Action "logs" -Component "cex-backend" -Follow
   
   # Port forward to Grafana
   .\k8s-utils.ps1 -Action "port-forward" -Component "grafana" -Port "3000"
   ```

## Best Practices

1. **Deployment:**
   - Always test in staging first
   - Use blue-green or rolling deployments
   - Implement proper health checks
   - Monitor deployments closely

2. **Resource Management:**
   - Set appropriate resource requests and limits
   - Use horizontal pod autoscaling
   - Implement pod disruption budgets
   - Regular cleanup of old resources

3. **Backup and Recovery:**
   - Automated daily backups
   - Test restore procedures regularly
   - Keep multiple backup copies
   - Document recovery procedures

4. **Security:**
   - Regular security updates
   - Vulnerability scanning
   - Network segmentation
   - Audit logging

## Support

Untuk bantuan atau pertanyaan:
- Email: devops@cexexchange.com
- Slack: #devops-support
- Documentation: https://docs.cexexchange.com/deployment

## Changelog

### v1.0.0 (2024-01-01)
- Initial release
- Production and staging deployment scripts
- Kubernetes utilities script
- Comprehensive documentation