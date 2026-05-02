#!/bin/bash
set -e

# Start Piston API in the background
/piston_api/src/docker-entrypoint.sh &
PISTON_PID=$!

# Wait until the API is ready
echo "[piston] Waiting for API to be ready..."
until curl -sf http://localhost:2000/api/v2/runtimes > /dev/null 2>&1; do
  sleep 1
done
echo "[piston] API is up. Installing language runtimes..."

install_package() {
  local lang=$1
  local version=$2
  echo "[piston] Installing $lang $version..."
  curl -sf -X POST http://localhost:2000/api/v2/packages \
    -H "Content-Type: application/json" \
    -d "{\"language\":\"$lang\",\"version\":\"$version\"}" \
    && echo "[piston] $lang $version installed." \
    || echo "[piston] WARNING: failed to install $lang $version"
}

install_package python  3.10.0
install_package javascript 18.15.0

echo "[piston] Ready."

# Hand control back to the Piston process
wait $PISTON_PID
