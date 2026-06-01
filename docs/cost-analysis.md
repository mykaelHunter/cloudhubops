# Cost analysis — CloudOpsHub

Period: 2026-05-29 → 2026-06-01

## Summary

This brief analysis uses the exported cost CSV in `docs/cost-analysis.csv` (sample days). The dataset shows a short window of daily charges; AKS node infrastructure accounts for the majority of observed spend.

## Totals (sample window)

- Total observed cost: USD 7.3051
- AKS (node pool / managed cluster) subtotal: USD 6.6633 (~91.2%)
- Resource group / other services subtotal: USD 0.6418 (~8.8%)

## Daily breakdown (source: `docs/cost-analysis.csv`)

- 2026-05-29 — cloudopshub-rg: USD 0.0150
- 2026-05-30 — cloudopshub-rg: USD 0.1666
- 2026-05-31 — cloudopshub-rg: USD 0.2381
- 2026-05-31 — mc_cloudopshub-rg_cloudopshub-aks_eastus (AKS): USD 2.4689
- 2026-06-01 — cloudopshub-rg: USD 0.2221
- 2026-06-01 — mc_cloudopshub-rg_cloudopshub-aks_eastus (AKS): USD 4.1943

## Notes about provisioning (why AKS cost is dominant)

- Terraform provisions AKS with a default node pool of 2 nodes and VM size `Standard_D2s_v4` (see `cloudopshub-terraform/modules/aks/main.tf`).
- ACR is created with `sku = "Basic"` (low registry costs) — see `cloudopshub-terraform/modules/acr/main.tf`.
- Networking and resource group resources are minimal by comparison (VNet, subnet, RG).

## Recommendations

- Review the AKS node sizing and scaling policy: consider using a smaller VM size, enable cluster autoscaler, or use spot/preemptible nodes for non-critical workloads.
- Consolidate dev/staging workloads onto fewer nodes when idle (schedule scale-to-zero for dev workloads if possible).
- Configure tagging and longer-term cost exports to capture full-month data for reliable monthly estimates.
- Consider Reserved Instances / Savings Plans or Azure Spot instances for workload components with predictable or interruptible characteristics.

## Where to look next

- Terraform: `cloudopshub-terraform/modules/aks/main.tf`
- Exported CSV: `docs/cost-analysis.csv`
- Architecture notes: `docs/architecture.md`
