#!/bin/sh
BASE="${PISTON_URL:-http://localhost:2000}/api/v2"

echo "Waiting for Piston at $BASE..."
until curl -sf "$BASE/runtimes" > /dev/null; do sleep 2; done
echo "Piston is up."

echo "Available packages from Piston repo:"
curl -s "$BASE/packages" | head -c 2000

echo ""
echo "Currently installed runtimes:"
curl -s "$BASE/runtimes"

echo ""
echo "Installing python 3.10.0..."
curl -s -X POST "$BASE/packages" \
  -H "Content-Type: application/json" \
  -d '{"language":"python","version":"3.10.0"}'

echo ""
echo "Installing node 18.15.0..."
curl -s -X POST "$BASE/packages" \
  -H "Content-Type: application/json" \
  -d '{"language":"node","version":"18.15.0"}'

echo ""
echo "Done. Final runtimes:"
curl -s "$BASE/runtimes"
