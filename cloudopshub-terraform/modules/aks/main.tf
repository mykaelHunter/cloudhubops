resource "azurerm_kubernetes_cluster" "aks" {

  name = var.aks_cluster_name

  location = var.location

  resource_group_name = var.resource_group_name

  dns_prefix = "cloudopshub"

  default_node_pool {

    name = "system"

    node_count = 2

    vm_size = "Standard_D2s_v4"
  }

  identity {
    type = "SystemAssigned"
  }
}
