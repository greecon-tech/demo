terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ---------------------------------------------------------------------------
# APIs
# ---------------------------------------------------------------------------

resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "sts.googleapis.com"
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# ---------------------------------------------------------------------------
# Artifact Registry
# ---------------------------------------------------------------------------

resource "google_artifact_registry_repository" "greecon" {
  project       = var.project_id
  location      = var.region
  repository_id = "greecon"
  format        = "DOCKER"
  description   = "Container images for the Greecon API and web services."

  depends_on = [google_project_service.required]
}

# ---------------------------------------------------------------------------
# Cloud SQL (Postgres). TimescaleDB is not available on Cloud SQL; the
# migrations enable it opportunistically and fall back to a plain table.
# ---------------------------------------------------------------------------

resource "google_sql_database_instance" "postgres" {
  project             = var.project_id
  name                = "greecon-postgres"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.db_deletion_protection

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"

    backup_configuration {
      enabled = true
    }

    ip_configuration {
      ipv4_enabled = true
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_sql_database" "greecon" {
  project  = var.project_id
  name     = "greecon"
  instance = google_sql_database_instance.postgres.name
}

resource "random_password" "db_user" {
  length  = 32
  special = false
}

resource "google_sql_user" "app" {
  project  = var.project_id
  name     = "greecon_app"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_user.result
}

# ---------------------------------------------------------------------------
# Secret Manager
# ---------------------------------------------------------------------------

resource "google_secret_manager_secret" "database_url" {
  project   = var.project_id
  secret_id = "greecon-database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id
  secret_data = format(
    "postgres://%s:%s@/%s?host=/cloudsql/%s",
    google_sql_user.app.name,
    random_password.db_user.result,
    google_sql_database.greecon.name,
    google_sql_database_instance.postgres.connection_name
  )
}

resource "google_secret_manager_secret" "mqtt_url" {
  project   = var.project_id
  secret_id = "greecon-mqtt-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

# Signs and verifies every login session (docs/07-security-and-rbac.md). Generated once here so
# it's never typed or committed anywhere — the API reads it from Secret Manager at runtime, same
# as the database URL below.
resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret" "jwt_secret" {
  project   = var.project_id
  secret_id = "greecon-jwt-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

# ---------------------------------------------------------------------------
# Service accounts
# ---------------------------------------------------------------------------

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "greecon-deployer"
  display_name = "Greecon CI/CD deployer (GitHub Actions)"
}

resource "google_service_account" "api_runtime" {
  project      = var.project_id
  account_id   = "greecon-api-runtime"
  display_name = "Greecon API Cloud Run runtime identity"
}

resource "google_service_account" "web_runtime" {
  project      = var.project_id
  account_id   = "greecon-web-runtime"
  display_name = "Greecon web Cloud Run runtime identity"
}

resource "google_project_iam_member" "deployer_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "api_runtime_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "api_runtime_secret_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "api_runtime_jwt_secret_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.jwt_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_runtime.email}"
}

# The web service's own identity is the only caller allowed to invoke the
# private API service — see google_cloud_run_v2_service_iam_member.api_invoker
# below. Nothing else grants public internet callers direct API access.

# ---------------------------------------------------------------------------
# Workload Identity Federation for GitHub Actions (no long-lived keys)
# ---------------------------------------------------------------------------

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "deployer_workload_identity" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

# ---------------------------------------------------------------------------
# Cloud Run
#
# `bootstrap_image` seeds the service on the first apply, before CI has ever
# pushed a real image. Every apply after that ignores the image field so
# `gcloud run deploy` (see .github/workflows/deploy.yml) can update it without
# Terraform reverting the revision on the next plan.
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  name     = "greecon-api"
  location = var.region

  template {
    service_account = google_service_account.api_runtime.email

    containers {
      image = var.bootstrap_image

      ports {
        container_port = 4000
      }

      env {
        name  = "API_PORT"
        value = "4000"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service" "web" {
  project  = var.project_id
  name     = "greecon-web"
  location = var.region

  template {
    service_account = google_service_account.web_runtime.email

    containers {
      image = var.bootstrap_image

      ports {
        container_port = 3000
      }

      env {
        name  = "GREECON_API_URL"
        value = google_cloud_run_v2_service.api.uri
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [google_project_service.required]
}

# The API is private: only the web service's own identity may call it. Pilot
# visitors reach the public web service, which calls the API server-to-server
# with a signed identity token (see apps/web/src/lib/api.ts) — nobody can
# reach the API directly to spoof the x-user-role demo header.
resource "google_cloud_run_v2_service_iam_member" "api_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.web_runtime.email}"
}

resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
