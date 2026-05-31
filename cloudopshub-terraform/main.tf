module "resource_group" {

  source = "./modules/resource-group"

  resource_group_name = var.resource_group_name

  location = var.location
}

module "networking" {

  source = "./modules/networking"

  resource_group_name = module.resource_group.resource_group_name

  location = var.location
}

module "acr" {

  source = "./modules/acr"

  resource_group_name = module.resource_group.resource_group_name

  location = var.location

  acr_name = var.acr_name
}

module "aks" {

  source = "./modules/aks"

  resource_group_name = module.resource_group.resource_group_name

  location = var.location

  aks_cluster_name = var.aks_cluster_name
}
