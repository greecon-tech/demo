terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "greecon-database-url"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "mqtt_url" {
  secret_id = "greecon-mqtt-url"

  replication {
    auto {}
  }
}

# Cloud Run, Cloud SQL, VPC connector, Artifact Registry, and alerting policies
# are intentionally represented as the next deployment module. The MVP foundation
# keeps production secrets out of source control and documents the intended target.
