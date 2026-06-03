# CloudOpsHub — Architecture Document

## Table of Contents

- [System Overview](#system-overview)
- [Infrastructure Layer](#infrastructure-layer)
- [Application Layer](#application-layer)
- [CI/CD Layer](#cicd-layer)
- [Observability Layer](#observability-layer)
- [Security Layer](#security-layer)
- [Architecture Decision Records](#architecture-decision-records)

---

## System Overview

CloudOpsHub is a hybrid multi-cluster SaaS platform serving analytics dashboards to SMEs across Africa and Europe. The platform is designed around three core principles:

1. **Everything is code** — Infrastructure, configuration, deployments, and alerts are all version-controlled
2. **GitOps is the source of truth** — No manual `kubectl apply` in production; all changes flow through Git
3. **Shift security left** — Vulnerabilities are caught in CI before code ever reaches a cluster

### High-Level Component Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub Repository                           │
│  src/backend  src/frontend  k8s/  infra/  ansible/  .github/       │
└────────────────────────────┬────────────────────────────────────────┘
                             │ triggers
              ┌──────────────▼──────────────┐
              │     GitHub Actions CI/CD     │
              │  lint → test → scan → build  │
              │  → push → sign → deploy      │
              └──────────────┬──────────────┘
                             │ pushes images to
              ┌──────────────▼──────────────┐
              │    Azure Container Registry  │
              │  payday-backend:dev/stg/prod │
              │  payday-frontend:dev/stg/prod│
              └──────────────┬──────────────┘
                             │ pulled by
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    ▼                        ▼                        ▼
┌───────────┐       ┌────────────────┐      ┌────────────────┐
│ kind VM   │       │  AKS — dev     │      │  AKS — staging │
│  prod     │       │  namespace     │      │  namespace     │
│  (local)  │       │  1 replica     │      │  2 replicas    │
└─────┬─────┘       └────────────────┘      └────────────────┘
      │
      └── ArgoCD manages ALL clusters from here
```

---

## Infrastructure Layer

### Terraform — AKS Provisioning

Terraform manages all Azure cloud resources. The state is stored remotely to enable team collaboration.

**Resources provisioned:**
- Resource Group: `cloudopshub-rg` (eastus)
- AKS Cluster: `cloudopshub-aks`
  - 2 nodes, Standard_B2s VM size
  - System-assigned managed identity
  - Azure CNI networking
  - Standard load balancer SKU
- Implicit: VNet, subnet, NSG, public IP for load balancer

**Key design decisions:**
- `SystemAssigned` identity avoids managing service principal credentials
- `Standard_B2s` nodes balance cost and capacity for a project workload
- Azure CNI (not kubenet) gives pods real VNet IPs, enabling Azure-native network policies

### Ansible — VM Configuration

Ansible automates the full setup of the Ubuntu VM that runs the kind cluster.

**Execution order:**
```
security → docker → kubectl → kind → helm → argocd
```

**What each role does:**

| Role | Responsibility |
|---|---|
| security | UFW firewall, fail2ban SSH protection, kernel tuning, unattended security updates |
| docker | Docker CE install, daemon config, user group membership |
| kubectl | kubectl binary, bash completion, k alias |
| kind | kind binary, cluster config template, cluster creation, namespace setup |
| helm | Helm install, repo registration (prometheus-community, argo, bitnami) |
| argocd | ArgoCD server deployment, CLI install, cluster registration, app creation |

### kind — Local Kubernetes

kind (Kubernetes in Docker) runs a 3-node cluster on the VM:
- 1 control-plane node (with `ingress-ready=true` label)
- 2 worker nodes

Port mappings:
- `8080:80` — HTTP ingress
- `8443:443` — HTTPS ingress

The kind cluster is where ArgoCD lives. It manages itself (in-cluster) and the AKS cluster remotely.

> Note: when accessing the ArgoCD UI from the host machine, use `kubectl port-forward svc/argocd-server -n argocd 9090:443` and SSH tunnel port `9090` to avoid conflicts with the application ingress on host port `8080`.

---

## Application Layer

### Components

```
┌─────────────────────────────────────────────┐
│              Kubernetes Namespace            │
│                                             │
│  ┌──────────────┐    ┌──────────────────┐  │
│  │   Frontend   │    │     Backend      │  │
│  │  React/Vite  │───▶│   Flask/Python   │  │
│  │  nginx proxy │    │   Gunicorn WSGI  │  │
│  └──────────────┘    └────────┬─────────┘  │
│                               │            │
│                    ┌──────────▼─────────┐  │
│                    │    PostgreSQL 15    │  │
│                    │   bitnami/postgres  │  │
│                    │   StatefulSet+PVC   │  │
│                    └────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Frontend (React + Vite + nginx)

- Built with Vite, served by nginx
- nginx uses `envsubst` templates — the backend URL is injected at pod startup via `BACKEND_HOST` and `BACKEND_PORT` environment variables
- This means the same Docker image works in all environments; only the k8s env vars change
- Static assets cached with 1-year `Cache-Control` headers

### Backend (Flask + Gunicorn)

- Python Flask REST API
- Gunicorn WSGI server (workers scaled per environment)
- Runs database migrations automatically on startup via `docker-entrypoint.sh`
- `/health` endpoint for Kubernetes liveness and readiness probes
- `imagePullPolicy: Always` ensures fresh image on every deployment

### Database (PostgreSQL 15 via Bitnami)

- StatefulSet with PersistentVolumeClaim
- Dev: ephemeral storage (no PVC) — fast restarts
- Staging: 2Gi PVC
- Prod: 10Gi PVC with `managed-csi` StorageClass (Azure managed disk)

---

## CI/CD Layer
### GitHub Environments and OIDC

GitHub Actions uses environment-scoped deployment jobs with Azure OIDC authentication.
- `dev` deploys automatically from `develop`
- `staging` deploys automatically from `main`
- `production` requires manual approval before promotion
### CI Pipeline (GitHub Actions)

**Triggered by:** Push to `develop` or `main`, or PR to `main`

**Jobs:**

```
test-and-scan
├── Checkout
├── Downcase image name
├── Set environment tag (dev | staging based on branch)
├── Install dependencies
├── Lint (flake8 / eslint)
├── Test (pytest / vitest)
├── CodeQL SAST analysis
├── Docker Buildx setup
├── Azure OIDC login
├── ACR login
├── Build + Push image (:sha + :dev|staging tag)
├── Trivy CVE scan → SARIF upload
├── Cosign keyless image signing
```

**Environment mapping:**

| Branch | GitHub Environment | Image Tag | Dockerfile |
|---|---|---|---|
| develop | dev | :dev | Dockerfile.dev |
| main | staging | :staging | Dockerfile.prod |

### CD Pipeline (GitHub Actions)

**Triggered by:** Successful CI pipeline run

**deploy-dev** (develop branch):
- Updates `k8s/dev/` manifests with new SHA
- Commits back to Git
- ArgoCD auto-syncs to AKS dev namespace

**deploy-staging** (main branch):
- Updates `k8s/staging/` manifests with new SHA
- Commits back to Git
- ArgoCD auto-syncs to AKS staging namespace

**deploy-prod** (manual approval):
- Requires reviewer approval in GitHub `prod` environment
- Retags `:staging` image as `:prod` in ACR — no rebuild
- Updates `k8s/prod/` manifests
- ArgoCD syncs to kind prod namespace (or manual `argocd app sync`)

### ArgoCD — GitOps Controller

ArgoCD is installed on the kind cluster and manages both clusters:

| App | Destination | Sync Policy |
|---|---|---|
| cloudopshub-dev | AKS | Automated (auto-prune, self-heal) |
| cloudopshub-staging | AKS | Automated (auto-prune, self-heal) |
| cloudopshub-prod | kind | Manual |

ArgoCD detects changes to the `k8s/` directory and reconciles the cluster state with Git. If a pod is manually deleted or modified, self-heal restores it automatically (for dev/staging).

---

## Observability Layer

### Metrics — Prometheus + Grafana

Installed via `kube-prometheus-stack` Helm chart on both clusters.

**What is scraped:**
- Node metrics (CPU, memory, disk, network)
- Pod and container metrics
- Kubernetes API server metrics
- Custom app metrics (if instrumented)

**Grafana dashboards:**
- Kubernetes cluster overview
- Node resource utilization
- Pod CPU/memory per namespace
- Deployment health

**AKS Grafana** is exposed via LoadBalancer for easy external access.

### Logs — Loki + Promtail

- Promtail runs as a DaemonSet — one pod per node, ships logs to Loki
- Loki stores logs indexed by labels (namespace, pod, container)
- Logs queryable in Grafana Explore via LogQL

### Alerts — Alertmanager

Configured on AKS cluster. Alert rules cover:

| Alert | Condition | Severity |
|---|---|---|
| PodCrashLooping | restarts > 5 in 10m | Critical |
| HighCPUUsage | CPU > 80% for 5m | Warning |
| HighMemoryUsage | Memory > 85% for 5m | Warning |
| DeploymentReplicasMismatch | available != desired | Critical |
| NodeNotReady | node condition != Ready | Critical |

---

## Security Layer

### OIDC Federated Authentication

GitHub Actions authenticates to Azure using **OpenID Connect (OIDC)** — no stored credentials anywhere. Each GitHub environment (dev, staging, prod) has its own federated credential in Azure Entra ID.

### Image Security

1. **Trivy** scans every built image for CVEs — pipeline fails on CRITICAL findings
2. **CodeQL** runs SAST on every push
3. **Cosign** signs every pushed image using keyless signing via Sigstore's public Rekor transparency log
4. **imagePullPolicy: Always** ensures latest signed image is always pulled

### Kubernetes Security

- `NetworkPolicy` restricts pod-to-pod traffic per namespace
- `PodDisruptionBudget` ensures minimum availability during updates (prod only)
- ACR pull secret (`acr-secret`) injected per namespace
- RBAC roles scoped per team member via Azure Entra ID guest invitations

---

## Architecture Decision Records

### ADR-001: kind for local cluster instead of minikube

**Decision:** Use kind  
**Reason:** kind supports multi-node clusters (control-plane + workers) which better reflects production topology. minikube is single-node only. kind also runs inside Docker with no hypervisor dependency.

### ADR-002: ArgoCD on kind, not AKS

**Decision:** Install ArgoCD on kind cluster  
**Reason:** Project requirement specifies a single CD installation managing all clusters. kind is always running (VM is always on) making it a reliable ArgoCD host. AKS costs money when idle.

### ADR-003: Prod on kind, dev+staging on AKS

**Decision:** Reverse the typical cloud/local split  
**Reason:** Demonstrates network latency difference between cloud-hosted (AKS dev/staging) and on-premise (kind prod) deployments — a key project requirement for showing geographic performance differences.

### ADR-004: No rebuild for prod — retag staging image

**Decision:** Prod image is a retag of staging, not a new build  
**Reason:** The image that passed all tests in staging is exactly what should run in prod. Rebuilding introduces the risk of non-deterministic build outputs. Retagging guarantees bit-for-bit identity.

### ADR-005: envsubst for nginx backend URL

**Decision:** Use nginx template + envsubst instead of ConfigMaps  
**Reason:** ConfigMaps require cluster-side patching and don't integrate with GitOps cleanly. envsubst bakes the pattern into the image and lets Kubernetes env vars control the value per environment — one image, all environments.
