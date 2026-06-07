# Deployment on Google Cloud

The target production infrastructure is Google Cloud:

- Cloud Run for API and web services.
- Cloud SQL for PostgreSQL with TimescaleDB-compatible planning or managed PostgreSQL plus extension support where available.
- Secret Manager for secrets.
- Artifact Registry for container images.
- Cloud Logging and Cloud Monitoring for logs, metrics, and alerting.
- Grafana for operational dashboards.

## Terraform

`infra/terraform` contains the first Secret Manager foundation. Cloud Run, Cloud SQL, networking, artifact registry, and alerting policies should be added as deployment modules once production boundaries are confirmed.

## Production Requirements

- No real secrets in source control.
- Dedicated service accounts per service.
- Least-privilege IAM.
- Private database access.
- Structured logs.
- Health checks.
- Alert policies for API health, database saturation, ingestion failures, MQTT bridge failures, gateway offline events, and safety blocks.

## MQTT Production Note

The local MVP uses Mosquitto in Docker. Production MQTT needs a hardened broker or managed messaging bridge with TLS, gateway identity, topic authorization, and audit logging for critical channels.
