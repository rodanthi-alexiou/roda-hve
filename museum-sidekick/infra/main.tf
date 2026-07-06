# Museum Sidekick — cost-conscious POC infrastructure.
#
# Design for low cost:
#   * Container Apps scale to zero (min_replicas = 0) — no compute cost when idle.
#   * Azure OpenAI gpt-4o deployed at low capacity (10K TPM).
#   * Basic-tier Container Registry.
#   * Passwordless: a user-assigned managed identity with data-plane RBAC on
#     Azure OpenAI (no API keys in the app).
#
# Remember to run `azd down --purge` when finished to avoid ongoing charges and
# to purge the soft-deleted OpenAI account.

locals {
  resource_token = lower(substr(sha256(var.environment_name), 0, 8))
  tags           = { "azd-env-name" = var.environment_name }
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.environment_name}"
  location = var.location
  tags     = local.tags
}

# --- Observability (required by the Container Apps environment) ---------------

resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${local.resource_token}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

# --- Identity & registry ------------------------------------------------------

resource "azurerm_user_assigned_identity" "app" {
  name                = "id-${local.resource_token}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags
}

resource "azurerm_container_registry" "main" {
  name                = "cr${local.resource_token}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# --- Azure OpenAI -------------------------------------------------------------

resource "azurerm_cognitive_account" "openai" {
  name                  = "oai-${local.resource_token}"
  location              = azurerm_resource_group.main.location
  resource_group_name   = azurerm_resource_group.main.name
  kind                  = "OpenAI"
  sku_name              = "S0"
  custom_subdomain_name = "oai-${local.resource_token}"
  tags                  = local.tags
}

resource "azurerm_cognitive_deployment" "gpt4o" {
  name                 = var.openai_model_name
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = var.openai_model_name
    version = var.openai_model_version
  }

  sku {
    name     = "Standard"
    capacity = var.openai_capacity
  }
}

# The app's managed identity may call the OpenAI data plane (no keys).
resource "azurerm_role_assignment" "openai_user_app" {
  scope                = azurerm_cognitive_account.openai.id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Optionally grant the deploying developer the same role for local testing.
resource "azurerm_role_assignment" "openai_user_dev" {
  count                = var.principal_id == "" ? 0 : 1
  scope                = azurerm_cognitive_account.openai.id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = var.principal_id
}

# --- Container Apps -----------------------------------------------------------

resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${local.resource_token}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                       = local.tags
}

# Placeholder image used until azd builds and pushes the real image.
locals {
  placeholder_image = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
}

resource "azurerm_container_app" "api" {
  name                         = "ca-api-${local.resource_token}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = merge(local.tags, { "azd-service-name" = "api" })

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "api"
      image  = local.placeholder_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "AZURE_OPENAI_ENDPOINT"
        value = azurerm_cognitive_account.openai.endpoint
      }
      env {
        name  = "AZURE_OPENAI_DEPLOYMENT"
        value = azurerm_cognitive_deployment.gpt4o.name
      }
      env {
        name  = "AZURE_OPENAI_API_VERSION"
        value = "2024-10-21"
      }
      # Tells DefaultAzureCredential which user-assigned identity to use.
      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.app.client_id
      }
      env {
        name  = "PORT"
        value = "3000"
      }
    }
  }

  # azd manages the image after the first deploy.
  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }
}

resource "azurerm_container_app" "frontend" {
  name                         = "ca-web-${local.resource_token}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = merge(local.tags, { "azd-service-name" = "frontend" })

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "frontend"
      image  = local.placeholder_image
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }
}
