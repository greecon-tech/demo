output "secret_names" {
  description = "Secret Manager entries expected by Cloud Run services."
  value = {
    database_url = google_secret_manager_secret.database_url.secret_id
    mqtt_url     = google_secret_manager_secret.mqtt_url.secret_id
  }
}
