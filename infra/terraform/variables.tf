variable "project_id" {
  description = "Google Cloud project ID for the Greecon platform."
  type        = string
}

variable "region" {
  description = "Default Google Cloud region."
  type        = string
  default     = "europe-west1"
}

variable "github_repository" {
  description = "GitHub \"owner/repo\" allowed to deploy via Workload Identity Federation."
  type        = string
  default     = "greecon-tech/demo"
}

variable "db_tier" {
  description = "Cloud SQL machine tier. Small by default for a pilot; resize before real load."
  type        = string
  default     = "db-g1-small"
}

variable "db_deletion_protection" {
  description = "Whether Terraform is blocked from destroying the Cloud SQL instance. Keep true once real pilot data exists."
  type        = bool
  default     = false
}

variable "bootstrap_image" {
  description = "Placeholder container image used only for the first `terraform apply`, before CI has pushed a real image. Cloud Run services ignore image changes afterward; the deploy workflow updates them directly."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}
