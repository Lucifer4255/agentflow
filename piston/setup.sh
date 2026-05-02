#!/bin/bash
# Run this once after `docker compose up` to install language runtimes.

BASE="http://localhost:2000/api/v2"

echo "Waiting for Piston..."
until curl -sf "$BASE/runtimes" > /dev/null; do sleep 1; done
echo "Piston is up."

install() {
  echo "Installing $1 $2..."
  curl -sf -X POST "$BASE/packages" \
    -H "Content-Type: application/json" \
    -d "{\"language\":\"$1\",\"version\":\"$2\"}" \
    && echo "$1 $2 done." \
    || echo "WARNING: failed to install $1 $2"
}

install python 3.10.0
install node   18.15.0

echo "All done. Available runtimes:"
curl -sf "$BASE/runtimes" | python3 -m json.tool
