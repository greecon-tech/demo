variable "project_id" {
  description = "Google Cloud project ID for the Greecon platform."
  type        = string
}

variable "region" {
  description = "Default Google Cloud region."
  type        = string
  default     = "europe-west1"
}
