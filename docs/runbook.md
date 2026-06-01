# CloudOpsHub — Operations Runbook

> This runbook covers day-to-day operations, incident response, deployment procedures, and recovery steps for the CloudOpsHub platform.

---

## Table of Contents

1. [Access & Contexts](#1-access--contexts)
2. [Deployment Runbook](#2-deployment-runbook)
3. [Rollback Runbook](#3-rollback-runbook)
4. [Monitoring & Alerting](#4-monitoring--alerting)
5. [Troubleshooting Guide](#5-troubleshooting-guide)
6. [Backup & Restore](#6-backup--restore)
7. [Scaling Operations](#7-scaling-operations)
8. [Certificate & Secret Rotation](#8-certificate--secret-rotation)

---

## 1. Access & Contexts

### Kubernetes Contexts

```bash
# List all contexts
kubectl config get-contexts

# Switch to AKS (dev + staging)
kubectl config use-context cloudopshub-aks

# Switch to kind (prod)
kubectl config use-context kind-cloudopshub-local

# Run a command against a specific context without switching
kubectl get pods -n prod --context=kind-cloudopshub-local
kubectl get pods -n dev --context=cloudopshub-aks
```

### ArgoCD Access

ArgoCD runs on the kind cluster. Access the UI via SSH tunnel:

```bash
# On the VM — start port-forward (keep running)
kubectl port-forward svc/argocd-server -n argocd 9090:443

# On your host machine — open SSH tunnel
ssh -L 9090:localhost:9090 <vm-user>@<vm-ip>

# Then open in browser
https://localhost:9090
```

CLI login:
```bash
argocd login localhost:9090 --insecure
# username: admin
# password: (see below)
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

### Grafana Access

```bash
# AKS Grafana — get public IP
kubectl get svc prometheus-grafana -n monitoring --context=cloudopshub-aks

# Open: http://<EXTERNAL-IP>
# Username: admin
# Password: cloudopshub123
```

---

## 2. Deployment Runbook

### Standard Deployment (Automated)

Deployments to dev and staging are fully automated. No manual steps required.

| Action | Result |
|---|---|
| Push to `develop` | Deploys to AKS dev namespace |
| Merge PR to `main` | Deploys to AKS staging namespace |
| Approve prod in GitHub | Deploys to kind prod namespace |

**Monitor a deployment:**
```bash
# Watch GitHub Actions
# Go to: github.com/mykaelHunter/cloudopshub/actions

# Watch ArgoCD sync
argocd app get cloudopshub-dev
argocd app get cloudopshub-staging

# Watch pods rolling out
kubectl rollout status deployment/payday-backend -n dev --context=cloudopshub-aks
kubectl rollout status deployment/payday-frontend -n staging --context=cloudopshub-aks
```

### Manual Deployment (Emergency)

If GitHub Actions is unavailable, deploy manually:

```bash
# 1. Build and push image
az acr login --name rapiddeploy
docker build -t rapiddeploy.azurecr.io/rapiddeploy/payday-backend:manual-$(date +%Y%m%d) \
  src/backend -f src/backend/Dockerfile.prod
docker push rapiddeploy.azurecr.io/rapiddeploy/payday-backend:manual-$(date +%Y%m%d)

# 2. Update manifest
sed -i "s|payday-backend:.*|payday-backend:manual-$(date +%Y%m%d)|g" k8s/prod/backend.yaml

# 3. Commit and push (ArgoCD picks it up)
git add k8s/prod/backend.yaml
git commit -m "chore: emergency manual deployment"
git push origin main

# Or sync directly via ArgoCD
argocd app sync cloudopshub-prod
```

### Promote Staging Image to Prod Manually

```bash
az acr login --name rapiddeploy

STAGING_DIGEST=$(az acr repository show \
  --name rapiddeploy \
  --image rapiddeploy/payday-backend:staging \
  --query digest -o tsv)

docker pull rapiddeploy.azurecr.io/rapiddeploy/payday-backend@${STAGING_DIGEST}
docker tag rapiddeploy.azurecr.io/rapiddeploy/payday-backend@${STAGING_DIGEST} \
           rapiddeploy.azurecr.io/rapiddeploy/payday-backend:prod
docker push rapiddeploy.azurecr.io/rapiddeploy/payday-backend:prod

# Repeat for frontend
```

---

## 3. Rollback Runbook

### Rollback via ArgoCD (Recommended)

```bash
# View deployment history
argocd app history cloudopshub-prod

# Rollback to previous revision
argocd app rollback cloudopshub-prod <revision-number>

# Example: rollback to revision 5
argocd app rollback cloudopshub-prod 5
```

### Rollback via Kubernetes (Fast)

```bash
# View rollout history
kubectl rollout history deployment/payday-backend -n prod --context=kind-cloudopshub-local

# Rollback to previous version immediately
kubectl rollout undo deployment/payday-backend -n prod --context=kind-cloudopshub-local

# Rollback to a specific revision
kubectl rollout undo deployment/payday-backend -n prod \
  --context=kind-cloudopshub-local --to-revision=3

# Monitor rollback
kubectl rollout status deployment/payday-backend -n prod --context=kind-cloudopshub-local
```

### Rollback via Git (GitOps Method)

```bash
# Revert the manifest commit in Git
git log --oneline k8s/prod/backend.yaml

# Revert to previous commit
git revert <commit-sha>
git push origin main

# ArgoCD will auto-sync the revert (or run manually)
argocd app sync cloudopshub-prod
```

### Database Rollback

```bash
# List available Velero backups
velero backup get

# Restore from a specific backup
velero restore create --from-backup <backup-name> \
  --include-namespaces prod \
  --include-resources persistentvolumeclaims,persistentvolumes

# Monitor restore
velero restore describe <restore-name>
```

---

## 4. Monitoring & Alerting

### Check Cluster Health

```bash
# Node status — AKS
kubectl get nodes --context=cloudopshub-aks

# Node status — kind
kubectl get nodes --context=kind-cloudopshub-local

# Pod status across all namespaces — AKS
kubectl get pods -A --context=cloudopshub-aks

# Pod status — kind prod
kubectl get pods -n prod --context=kind-cloudopshub-local
```

### Check Application Health

```bash
# Backend health endpoint
kubectl exec -n prod deployment/payday-backend \
  --context=kind-cloudopshub-local -- curl -s localhost:5000/health

# Check recent logs — backend
kubectl logs deployment/payday-backend -n prod \
  --context=kind-cloudopshub-local --tail=100

# Check recent logs — frontend
kubectl logs deployment/payday-frontend -n dev \
  --context=cloudopshub-aks --tail=50

# Follow logs in real time
kubectl logs -f deployment/payday-backend -n staging --context=cloudopshub-aks
```

### Prometheus Queries (Run in Grafana)

```promql
# CPU usage by pod
rate(container_cpu_usage_seconds_total{namespace="prod"}[5m])

# Memory usage by pod
container_memory_working_set_bytes{namespace="prod"}

# HTTP error rate
rate(nginx_http_requests_total{status=~"5.."}[5m])

# Pod restart count
kube_pod_container_status_restarts_total{namespace="prod"}
```

### ArgoCD App Status

```bash
# Quick overview of all apps
argocd app list

# Detailed status
argocd app get cloudopshub-prod

# Force refresh (re-check Git)
argocd app get cloudopshub-prod --refresh
```

---

## 5. Troubleshooting Guide

### Pod in CrashLoopBackOff

```bash
# Check logs from the crashed container
kubectl logs <pod-name> -n <namespace> --previous --context=<context>

# Describe pod for events
kubectl describe pod <pod-name> -n <namespace> --context=<context>

# Common causes:
# 1. Missing env vars → check ConfigMap and Secrets
# 2. Database not ready → check postgres pod
# 3. Health probe too aggressive → increase initialDelaySeconds
# 4. Image pull failure → check ACR secret
```

### ImagePullBackOff

```bash
# Check if ACR secret exists
kubectl get secret acr-secret -n <namespace> --context=<context>

# Recreate if missing
kubectl create secret docker-registry acr-secret \
  --docker-server=rapiddeploy.azurecr.io \
  --docker-username=rapiddeploy \
  --docker-password="$(az acr credential show --name rapiddeploy --query 'passwords[0].value' -o tsv)" \
  --namespace <namespace> --context=<context>

# Verify imagePullSecrets on deployment
kubectl get deployment <name> -n <namespace> \
  -o jsonpath='{.spec.template.spec.imagePullSecrets}' --context=<context>
```

### ArgoCD App OutOfSync

```bash
# Check what's different
argocd app diff cloudopshub-prod

# Force sync
argocd app sync cloudopshub-prod --force

# If stuck, hard refresh
argocd app get cloudopshub-prod --hard-refresh
argocd app sync cloudopshub-prod
```

### Frontend nginx Unknown Variable Error

```bash
# Check if template file has correct name (singular .template not .templates)
kubectl exec -it deployment/payday-frontend -n <namespace> \
  --context=<context> -- ls /etc/nginx/templates/

# Check env vars are injected
kubectl exec -it deployment/payday-frontend -n <namespace> \
  --context=<context> -- env | grep BACKEND

# Should show:
# BACKEND_HOST=payday-backend.<namespace>.svc.cluster.local
# BACKEND_PORT=5000
```

### Database Connection Issues

```bash
# Check postgres is running
kubectl get pods -n <namespace> --context=<context> | grep postgres

# Test connection from backend pod
kubectl exec -it deployment/payday-backend -n <namespace> \
  --context=<context> -- python -c \
  "import psycopg2; print('DB OK')"

# Check postgres logs
kubectl logs statefulset/postgres -n <namespace> --context=<context>
```

### kind Cluster Not Starting After VM Reboot

```bash
# Check if Docker is running
sudo systemctl status docker

# Check kind cluster status
kind get clusters

# If cluster is gone, recreate it
kind create cluster --config ~/cloudopshub/kind-cluster.yaml

# Re-merge kubeconfigs
az aks get-credentials --resource-group cloudopshub-rg --name cloudopshub-aks

# Restart ArgoCD port-forward
kubectl port-forward svc/argocd-server -n argocd 9090:443 &
```

---

## 6. Backup & Restore

### Velero Backup Operations

```bash
# Create on-demand backup
velero backup create cloudopshub-backup-$(date +%Y%m%d) \
  --include-namespaces prod \
  --context kind-cloudopshub-local

# List all backups
velero backup get

# Describe a backup
velero backup describe cloudopshub-backup-20260601

# Delete old backup
velero backup delete cloudopshub-backup-20260501
```

### Restore from Backup

```bash
# Full namespace restore
velero restore create --from-backup cloudopshub-backup-20260601

# Restore only PVCs (database data)
velero restore create --from-backup cloudopshub-backup-20260601 \
  --include-resources persistentvolumeclaims,persistentvolumes

# Watch restore progress
velero restore describe <restore-name> --details
```

### Manual PostgreSQL Backup

```bash
# Dump database from running pod
kubectl exec -n prod statefulset/postgres \
  --context=kind-cloudopshub-local \
  -- pg_dump -U postgres payday > payday-backup-$(date +%Y%m%d).sql

# Restore
kubectl exec -i -n prod statefulset/postgres \
  --context=kind-cloudopshub-local \
  -- psql -U postgres payday < payday-backup-20260601.sql
```

---

## 7. Scaling Operations

### Horizontal Scaling (Manual)

```bash
# Scale backend replicas
kubectl scale deployment payday-backend -n prod --replicas=5 \
  --context=kind-cloudopshub-local

# Scale frontend replicas
kubectl scale deployment payday-frontend -n staging --replicas=3 \
  --context=cloudopshub-aks
```

### Check HPA Status

```bash
kubectl get hpa -n prod --context=kind-cloudopshub-local
kubectl describe hpa payday-backend -n prod --context=kind-cloudopshub-local
```

### AKS Node Scaling

```bash
# Scale AKS node pool
az aks scale \
  --resource-group cloudopshub-rg \
  --name cloudopshub-aks \
  --node-count 3 \
  --nodepool-name default
```

---

## 8. Certificate & Secret Rotation

### Rotate ACR Pull Secret

```bash
# Rotate ACR admin password in Azure Portal first, then:
for NS in dev staging; do
  kubectl delete secret acr-secret -n $NS --context=cloudopshub-aks
  kubectl create secret docker-registry acr-secret \
    --docker-server=rapiddeploy.azurecr.io \
    --docker-username=rapiddeploy \
    --docker-password="$(az acr credential show --name rapiddeploy --query 'passwords[0].value' -o tsv)" \
    --namespace $NS --context=cloudopshub-aks
done

kubectl delete secret acr-secret -n prod --context=kind-cloudopshub-local
kubectl create secret docker-registry acr-secret \
  --docker-server=rapiddeploy.azurecr.io \
  --docker-username=rapiddeploy \
  --docker-password="$(az acr credential show --name rapiddeploy --query 'passwords[0].value' -o tsv)" \
  --namespace prod --context=kind-cloudopshub-local
```

### Rotate ArgoCD Admin Password

```bash
argocd login localhost:9090 --insecure
argocd account update-password \
  --current-password <old-password> \
  --new-password <new-password>
```

### Rotate GitHub OIDC Federated Credentials

1. Go to **Azure Portal → Entra ID → App Registrations → cloudopshub**
2. Select **Certificates & Secrets → Federated Credentials**
3. Delete and recreate the credential for the affected environment
4. Update `AZURE_CLIENT_ID` in GitHub Environment secrets if the app registration changed
