#!/usr/bin/env bash
set -euo pipefail

# Provisions this Ubuntu-based industrial PC as a Greecon edge gateway: Node.js, a loopback-only
# Mosquitto broker, the edge-agent (MQTT -> cloud API bridge) and edge-simulator (bring-up/
# testing only) built from source, and systemd units for both.
#
# See docs/14-edge-hardware-deployment.md for the full walkthrough — this script assumes you've
# already done its prerequisite steps (OS installed, network configured, and — important —
# confirmed this box can actually reach the cloud API's private network, since the API is
# deliberately not exposed on the public internet; see that doc's "Before you start" section).
#
# Usage: sudo REPO_URL=git@github.com:greecon-tech/demo.git ./install.sh

REPO_URL="${REPO_URL:?Set REPO_URL to the git remote to deploy from, e.g. git@github.com:greecon-tech/demo.git}"
GIT_REF="${GIT_REF:-main}"
INSTALL_DIR=/opt/greecon
ENV_DIR=/etc/greecon
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

echo "==> Installing Node.js 22 LTS, git, and Mosquitto"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y git mosquitto mosquitto-clients

echo "==> Configuring Mosquitto to listen on loopback only"
cp "$SCRIPT_DIR/mosquitto-edge.conf" /etc/mosquitto/conf.d/edge.conf
systemctl enable mosquitto
systemctl restart mosquitto

echo "==> Creating the greecon service account"
id -u greecon >/dev/null 2>&1 || useradd --system --no-create-home --home-dir "$INSTALL_DIR" --shell /usr/sbin/nologin greecon

echo "==> Fetching the platform source into $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" fetch origin "$GIT_REF"
  git -C "$INSTALL_DIR" checkout "$GIT_REF"
  git -C "$INSTALL_DIR" reset --hard "origin/$GIT_REF"
else
  git clone --branch "$GIT_REF" "$REPO_URL" "$INSTALL_DIR"
fi

echo "==> Installing dependencies and building the edge workspaces"
cd "$INSTALL_DIR"
npm ci
npm run build:packages
npm run build -w @greecon/edge-agent
npm run build -w @greecon/edge-simulator
npm run build -w @greecon/edge-driver-modbus
chown -R greecon:greecon "$INSTALL_DIR"

echo "==> Installing site configuration"
mkdir -p "$ENV_DIR"
if [ ! -f "$ENV_DIR/edge.env" ]; then
  cp "$SCRIPT_DIR/edge.env.example" "$ENV_DIR/edge.env"
  echo "    Created $ENV_DIR/edge.env from the example — you must fill in SITE_ID, GATEWAY_ID, and API_URL before starting the service."
fi
chmod 600 "$ENV_DIR/edge.env"
chown root:greecon "$ENV_DIR/edge.env"

echo "==> Installing systemd units"
cp "$SCRIPT_DIR/greecon-edge-agent.service" /etc/systemd/system/
cp "$SCRIPT_DIR/greecon-edge-simulator.service" /etc/systemd/system/
cp "$SCRIPT_DIR/greecon-edge-driver-modbus.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable greecon-edge-agent
# Neither greecon-edge-simulator nor greecon-edge-driver-modbus is enabled here.
# greecon-edge-simulator is a synthetic telemetry source for proving the pipeline works before
# real devices are wired up. greecon-edge-driver-modbus needs /etc/greecon/modbus.json (see
# docs/16-modbus-driver.md) describing this site's real registers, which doesn't exist until
# devices are provisioned — enable it once that config is in place:
#   systemctl enable --now greecon-edge-driver-modbus

cat <<'EOF'

==> Install complete.

Next steps:
  1. Edit /etc/greecon/edge.env — set SITE_ID, GATEWAY_ID, and API_URL for this site.
  2. Start the bridge:      systemctl start greecon-edge-agent
  3. Check it's healthy:    systemctl status greecon-edge-agent
  4. Watch its logs:        journalctl -u greecon-edge-agent -f
  5. (Bring-up only) prove the pipeline with synthetic data:
       systemctl enable --now greecon-edge-simulator
     then disable it once a real driver is publishing on the same topic:
       systemctl disable --now greecon-edge-simulator
EOF
