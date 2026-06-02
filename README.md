# CloudOpsHub — Automated Multi-Cluster Infrastructure Platform

> A production-grade DevOps platform built on Kubernetes, GitOps, and cloud-native observability — serving analytics dashboards across Africa and Europe.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Cluster Layout](#cluster-layout)
- [Tech Stack](#tech-stack)
- [End-to-End Flow](#end-to-end-flow)
- [CI/CD Pipeline Flow](#cicd-pipeline-flow)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Environment Details](#environment-details)
- [Screenshots](#screenshots)
- [Contributing](#contributing)

---

## Overview

CloudOpsHub is a SaaS analytics platform modernized with:

- **Infrastructure as Code** — Terraform provisions AKS; Ansible configures the local VM
- **Multi-cluster Kubernetes** — kind cluster (local VM) + AKS cluster (Azure)
- **GitOps Continuous Delivery** — ArgoCD installed on kind manages deployments to both clusters
- **Secure CI/CD** — GitHub Actions with OIDC auth, Trivy scanning, Cosign image signing
- **Full Observability** — Prometheus + Grafana + Loki + Alertmanager on both clusters

---

## Architecture

```mermaid
graph TB
    subgraph Developer["👨‍💻 Developer Workflow"]
        DEV[Code Push]
        PR[Pull Request]
    end

    subgraph GitHub["GitHub"]
        REPO[Repository]
        CI_BE[CI — Backend Pipeline]
        CI_FE[CI — Frontend Pipeline]
        CD_BE[CD — Backend Pipeline]
        CD_FE[CD — Frontend Pipeline]
        ENV_DEV[Environment: dev]
        ENV_STG[Environment: staging]
        ENV_PRD[Environment: prod]
    end

    subgraph ACR["Azure Container Registry"]
        IMG_BE_DEV[payday-backend:dev]
        IMG_BE_STG[payday-backend:staging]
        IMG_BE_PRD[payday-backend:prod]
        IMG_FE_DEV[payday-frontend:dev]
        IMG_FE_STG[payday-frontend:staging]
        IMG_FE_PRD[payday-frontend:prod]
    end

    subgraph KIND["🖥️ Local VM — kind Cluster (prod)"]
        ARGOCD[ArgoCD — Central CD]
        subgraph PROD["prod namespace"]
            FE_PRD[Frontend x3]
            BE_PRD[Backend x3]
            DB_PRD[PostgreSQL]
        end
        subgraph MON_KIND["monitoring namespace"]
            PROM_KIND[Prometheus]
            GRAF_KIND[Grafana]
        end
    end

    subgraph AKS["☁️ Azure AKS Cluster (dev + staging)"]
        subgraph DEV_NS["dev namespace"]
            FE_DEV[Frontend x1]
            BE_DEV[Backend x1]
            DB_DEV[PostgreSQL]
        end
        subgraph STG_NS["staging namespace"]
            FE_STG[Frontend x2]
            BE_STG[Backend x2]
            DB_STG[PostgreSQL]
        end
        subgraph MON_AKS["monitoring namespace"]
            PROM_AKS[Prometheus]
            GRAF_AKS[Grafana LB]
            LOKI[Loki + Promtail]
            ALERT[Alertmanager]
        end
    end

    DEV -->|git push develop| REPO
    PR -->|merge to main| REPO
    REPO --> CI_BE
    REPO --> CI_FE
    CI_BE -->|on develop| ENV_DEV
    CI_BE -->|on main| ENV_STG
    CI_FE -->|on develop| ENV_DEV
    CI_FE -->|on main| ENV_STG
    ENV_DEV --> IMG_BE_DEV
    ENV_DEV --> IMG_FE_DEV
    ENV_STG --> IMG_BE_STG
    ENV_STG --> IMG_FE_STG
    CI_BE --> CD_BE
    CI_FE --> CD_FE
    CD_BE --> ENV_PRD
    CD_FE --> ENV_PRD
    ENV_PRD -->|retag staging| IMG_BE_PRD
    ENV_PRD -->|retag staging| IMG_FE_PRD
    CD_BE -->|update k8s manifests| REPO
    CD_FE -->|update k8s manifests| REPO
    ARGOCD -->|watches Git| REPO
    ARGOCD -->|syncs dev + staging| AKS
    ARGOCD -->|syncs prod| PROD
    IMG_BE_DEV --> BE_DEV
    IMG_FE_DEV --> FE_DEV
    IMG_BE_STG --> BE_STG
    IMG_FE_STG --> FE_STG
    IMG_BE_PRD --> BE_PRD
    IMG_FE_PRD --> FE_PRD
```

---

## Cluster Layout

| Environment | Cluster | Namespace | Replicas | Notes |
|---|---|---|---|---|
| dev | AKS | dev | 1 | Auto-deploy on `develop` push |
| staging | AKS | staging | 2 | Auto-deploy on `main` push |
| prod | kind (local) | prod | 3 | Manual approval required |

> **Design decision:** dev and staging run on AKS for cloud-native testing. Prod runs on the local kind cluster to demonstrate latency differences between cloud and on-premise deployments — a key project requirement.

---

## Tech Stack

| Category | Tool | Purpose |
|---|---|---|
| IaC | Terraform | Provision AKS, resource groups, networking |
| Config Mgmt | Ansible | Configure VM, install tools, bootstrap kind |
| Containers | Docker + Kubernetes | Containerized, versioned deployments |
| Local Cluster | kind | Dev-grade Kubernetes on Ubuntu VM |
| Cloud Cluster | Azure AKS | Production-grade managed Kubernetes |
| CI | GitHub Actions | Build, test, scan, push images |
| CD / GitOps | ArgoCD | Single install manages both clusters |
| Registry | Azure ACR | Private container image registry |
| Secrets | Kubernetes Secrets + OIDC | Secrets management, no stored credentials |
| Scanning | Trivy + CodeQL | Container CVE + SAST scanning |
| Image Signing | Cosign | Keyless image signing via Sigstore |
| Metrics | Prometheus + Grafana | Cluster and app metrics, dashboards |
| Logs | Loki + Promtail | Centralized log aggregation |
| Alerts | Alertmanager | Slack/email notifications |
| Backups | Velero | Cluster state + PV backups |

---

## End-to-End Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant CI as GitHub Actions CI
    participant CD as GitHub Actions CD
    participant ACR as Azure ACR
    participant Argo as ArgoCD (kind)
    participant AKS as AKS Cluster
    participant KIND as kind Cluster

    Dev->>GH: git push to develop
    GH->>CI: Trigger CI (dev environment)
    CI->>CI: Lint + Test + CodeQL SAST
    CI->>CI: Build Docker image
    CI->>CI: Trivy CVE scan
    CI->>ACR: Push :dev + :sha tags
    CI->>CI: Cosign sign image
    CI->>CD: Trigger CD (dev)
    CD->>GH: Update k8s/dev manifest SHA
    Argo->>GH: Detect manifest change
    Argo->>AKS: Sync dev namespace

    Dev->>GH: Merge PR to main
    GH->>CI: Trigger CI (staging environment)
    CI->>ACR: Push :staging + :sha tags
    CI->>CD: Trigger CD (staging)
    CD->>GH: Update k8s/staging manifest SHA
    Argo->>AKS: Sync staging namespace

    CD->>CD: Await manual approval (prod env)
    Dev->>CD: Approve production deployment
    CD->>ACR: Retag :staging as :prod
    CD->>GH: Update k8s/prod manifest SHA
    Argo->>KIND: Sync prod namespace
```

---

## CI/CD Pipeline Flow

```mermaid
flowchart LR
    A([Code Push]) --> B{Branch?}
    B -->|develop| C[CI — dev environment]
    B -->|main| D[CI — staging environment]

    C --> E[Lint & Test]
    D --> E

    E --> F[CodeQL SAST]
    F --> G[Docker Build]
    G --> H[Trivy CVE Scan]
    H --> I{CVEs found?}
    I -->|CRITICAL| J([❌ Fail Pipeline])
    I -->|Clean| K[Push to ACR]
    K --> L[Cosign Sign]
    L --> M{Branch?}
    M -->|develop| N[CD: Update dev manifest]
    M -->|main| O[CD: Update staging manifest]
    N --> P[ArgoCD → AKS dev]
    O --> Q[ArgoCD → AKS staging]
    O --> R{Approval?}
    R -->|Approved| S[Retag as prod]
    S --> T[CD: Update prod manifest]
    T --> U[ArgoCD → kind prod]
```

---

## Repository Structure

```
cloudopshub/
├── .github/
│   └── workflows/
│       ├── backend_pipeline_ci.yaml     # Backend CI
│       ├── backend_pipeline_cd.yaml     # Backend CD
│       ├── frontend_pipeline_ci.yaml    # Frontend CI
│       └── frontend_pipeline_cd.yaml   # Frontend CD
├── cloudopshub-terraform/
│   ├── .terraform.lock.hcl
│   ├── main.tf
│   ├── provider.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── acr/
│       ├── aks/
│       ├── networking/
│       └── resource-group/
├── ansible/
│   ├── site.yml                         # Master playbook
│   ├── inventory.ini
│   ├── group_vars/all.yml
│   └── roles/
│       ├── docker/
│       ├── kind/
│       ├── kubectl/
│       ├── helm/
│       ├── argocd/
│       └── security/
├── k8s/
│   ├── dev/
│   │   ├── backend.yaml
│   │   ├── frontend.yaml
│   │   └── postgres.yaml
│   ├── staging/
│   │   ├── backend.yaml
│   │   ├── frontend.yaml
│   │   └── postgres.yaml
│   └── prod/
│       ├── backend.yaml
│       ├── frontend.yaml
│       └── postgres.yaml
├── src/
│   ├── backend/                         # Flask API
│   └── frontend/                        # React + Vite
└── docs/
    ├── architecture.md
    ├── runbook.md
    └── medium-article.md
```

---

## Quick Start

### Prerequisites

- Ubuntu VM (min 7GB RAM, 2 vCPUs)
- Azure account with active subscription
- Azure CLI installed and logged in
- Ansible installed on your local machine

### 1. Clone the repo

```bash
git clone https://github.com/mykaelHunter/cloudopshub.git
cd cloudopshub
```

### 2. Provision AKS with Terraform

```bash
cd cloudopshub-terraform
terraform init
terraform plan
terraform apply
az aks get-credentials --resource-group cloudopshub-rg --name cloudopshub-aks
```

### 3. Bootstrap the VM with Ansible

```bash
cd ansible
# Update inventory.ini with your VM IP and user
ansible-playbook -i inventory.ini site.yml
```

### 4. Verify both clusters

```bash
kubectl config get-contexts
kubectl get nodes --context=kind-cloudopshub-local
kubectl get nodes --context=cloudopshub-aks
```

### 5. Create ACR pull secrets

```bash
for NS in dev staging; do
  kubectl create secret docker-registry acr-secret \
    --docker-server=rapiddeploy.azurecr.io \
    --docker-username=rapiddeploy \
    --docker-password="$(az acr credential show --name rapiddeploy --query 'passwords[0].value' -o tsv)" \
    --namespace $NS --context=cloudopshub-aks
done

kubectl create secret docker-registry acr-secret \
  --docker-server=rapiddeploy.azurecr.io \
  --docker-username=rapiddeploy \
  --docker-password="$(az acr credential show --name rapiddeploy --query 'passwords[0].value' -o tsv)" \
  --namespace prod --context=kind-cloudopshub-local
```

### 6. Push code to trigger the pipeline

```bash
git checkout develop
git push origin develop  # Triggers dev deployment
```

---

## Environment Details

### GitHub Environments & Secrets

Each environment requires these secrets configured in **GitHub → Settings → Environments**:

| Secret | Description |
|---|---|
| `AZURE_CLIENT_ID` | Federated OIDC app client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

### ArgoCD Applications

| App | Source Path | Target Cluster | Namespace | Sync |
|---|---|---|---|---|
| cloudopshub-dev | k8s/dev | AKS | dev | Auto |
| cloudopshub-staging | k8s/staging | AKS | staging | Auto |
| cloudopshub-prod | k8s/prod | kind | prod | Manual |

---

## Contributing

1. Branch from `develop` for features
2. Open a PR to `develop` → CI runs automatically
3. Merge to `main` → deploys to staging
4. Production deploys require team lead approval in GitHub Environments

**Screenshots**

Below are repository screenshots (paths reference files added under the `screenshots/` directory):

- **Application**
    - [screenshots/01-application/01_app-login-page.png](screenshots/01-application/01_app-login-page.png)
    - [screenshots/01-application/02_app-merchant-console.png](screenshots/01-application/02_app-merchant-console.png)
    - [screenshots/01-application/03_app-api-page.png](screenshots/01-application/03_app-api-page.png)

- **Infrastructure**
    - [screenshots/02-infrastructure/01_argocd-all-apps-synced.png](screenshots/02-infrastructure/01_argocd-all-apps-synced.png)
    - [screenshots/02-infrastructure/02_kind-cluster-dev-staging-pods.png](screenshots/02-infrastructure/02_kind-cluster-dev-staging-pods.png)
    - [screenshots/02-infrastructure/03_aks-cluster-prod-pods-3-replicas.png](screenshots/02-infrastructure/03_aks-cluster-prod-pods-3-replicas.png)
    - [screenshots/02-infrastructure/04_azure-container-registry-images.png](screenshots/02-infrastructure/04_azure-container-registry-images.png)

- **CI/CD Pipelines**
    - [screenshots/03-cicd-pipelines/01_backend-ci-pipeline.png](screenshots/03-cicd-pipelines/01_backend-ci-pipeline.png)
    - [screenshots/03-cicd-pipelines/02_frontend-ci-pipeline.png](screenshots/03-cicd-pipelines/02_frontend-ci-pipeline.png)
    - [screenshots/03-cicd-pipelines/03_backend-cd-pipeline-staging.png](screenshots/03-cicd-pipelines/03_backend-cd-pipeline-staging.png)
    - [screenshots/03-cicd-pipelines/04_backend-cd-pipeline-production.png](screenshots/03-cicd-pipelines/04_backend-cd-pipeline-production.png)
    - [screenshots/03-cicd-pipelines/05_frontend-cd-pipeline-staging.png](screenshots/03-cicd-pipelines/05_frontend-cd-pipeline-staging.png)
    - [screenshots/03-cicd-pipelines/06_frontend-cd-pipeline-production.png](screenshots/03-cicd-pipelines/06_frontend-cd-pipeline-production.png)

- **Observability**
    - [screenshots/04-observability/01_grafana-prometheus-alertmanager.png](screenshots/04-observability/01_grafana-prometheus-alertmanager.png)
    - [screenshots/04-observability/02_grafana-kubernetes-api-server-slo.png](screenshots/04-observability/02_grafana-kubernetes-api-server-slo.png)
    - [screenshots/04-observability/03_grafana-argocd-namespace-cpu-usage.png](screenshots/04-observability/03_grafana-argocd-namespace-cpu-usage.png)
    - [screenshots/04-observability/04_grafana-argocd-namespace-network-bandwidth.png](screenshots/04-observability/04_grafana-argocd-namespace-network-bandwidth.png)
    - [screenshots/04-observability/05_grafana-kubelet-pods-containers.png](screenshots/04-observability/05_grafana-kubelet-pods-containers.png)
    - [screenshots/04-observability/06_grafana-kubelet-storage-operations.png](screenshots/04-observability/06_grafana-kubelet-storage-operations.png)
    - [screenshots/04-observability/07_grafana-kubelet-request-duration-memory-cpu.png](screenshots/04-observability/07_grafana-kubelet-request-duration-memory-cpu.png)
    - [screenshots/04-observability/08_alertmanager-alerts-overview.png](screenshots/04-observability/08_alertmanager-alerts-overview.png)
    - [screenshots/04-observability/09_alertmanager-alerts-expanded.png](screenshots/04-observability/09_alertmanager-alerts-expanded.png)
    - [screenshots/04-observability/10_alertmanager-alerts-filtered-namespace.png](screenshots/04-observability/10_alertmanager-alerts-filtered-namespace.png)
    - [screenshots/04-observability/11_alertmanager-status.png](screenshots/04-observability/11_alertmanager-status.png)
    - [screenshots/04-observability/12_alertmanager-status-details.png](screenshots/04-observability/12_alertmanager-status-details.png)
    - [screenshots/04-observability/13_alertmanager-slack-alerts-kube-scheduler-down.png](screenshots/04-observability/13_alertmanager-slack-alerts-kube-scheduler-down.png)
    - [screenshots/04-observability/14_alertmanager-slack-alerts-kube-proxy-down.png](screenshots/04-observability/14_alertmanager-slack-alerts-kube-proxy-down.png)
