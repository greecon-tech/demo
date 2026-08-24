output "secret_names" {
  description = "Secret Manager entries expected by Cloud Run services."
  value = {
    database_url = google_secret_manager_secret.database_url.secret_id
    mqtt_url     = google_secret_manager_secret.mqtt_url.secret_id
  }
}

output "artifact_registry_repository" {
  description = "Docker repository the deploy workflow pushes images to."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.greecon.repository_id}"
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection name, used by the API's unix-socket connection."
  value       = google_sql_database_instance.postgres.connection_name
}

output "cloud_run_api_url" {
  description = "The API's Cloud Run URL. Private — only the web service's identity can invoke it."
  value       = google_cloud_run_v2_service.api.uri
}

output "cloud_run_web_url" {
  description = "The web app's public Cloud Run URL — this is the pilot URL."
  value       = google_cloud_run_v2_service.web.uri
}

output "deploy_service_account_email" {
  description = "GitHub Actions deploys as this service account, via Workload Identity Federation (no key)."
  value       = google_service_account.deployer.email
}

output "workload_identity_provider" {
  description = "Full resource name for the GitHub Actions OIDC provider. Set as the GCP_WORKLOAD_IDENTITY_PROVIDER GitHub repo variable."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "api_runtime_service_account_email" {
  description = "Runtime identity the API Cloud Run service runs as."
  value       = google_service_account.api_runtime.email
}

output "web_runtime_service_account_email" {
  description = "Runtime identity the web Cloud Run service runs as."
  value       = google_service_account.web_runtime.email
}
