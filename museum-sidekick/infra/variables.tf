variable "environment_name" {
  type        = string
  description = "Name of the azd environment; used to tag and name resources."
}

variable "location" {
  type        = string
  description = "Azure region for all resources."
  default     = "eastus2"
}

variable "principal_id" {
  type        = string
  description = "Object ID of the deploying user, granted data-plane access for local testing. Optional."
  default     = ""
}

variable "openai_model_name" {
  type        = string
  description = "Azure OpenAI model to deploy."
  default     = "gpt-4o"
}

variable "openai_model_version" {
  type        = string
  description = "Model version for the deployment."
  default     = "2024-11-20"
}

variable "openai_capacity" {
  type        = number
  description = "Deployment capacity in thousands of tokens-per-minute. Kept low for a POC."
  default     = 10
}
