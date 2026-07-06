# azd consumes these outputs as environment variables.

output "AZURE_LOCATION" {
  value = var.location
}

output "AZURE_RESOURCE_GROUP" {
  value = azurerm_resource_group.main.name
}

output "AZURE_CONTAINER_REGISTRY_ENDPOINT" {
  value = azurerm_container_registry.main.login_server
}

output "AZURE_OPENAI_ENDPOINT" {
  value = azurerm_cognitive_account.openai.endpoint
}

output "AZURE_OPENAI_DEPLOYMENT" {
  value = azurerm_cognitive_deployment.gpt4o.name
}

output "APPLICATIONINSIGHTS_CONNECTION_STRING" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}

# The API's public URL — used as the frontend's build-time API base URL.
output "SERVICE_API_URI" {
  value = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "SERVICE_FRONTEND_URI" {
  value = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}
