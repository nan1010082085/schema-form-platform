#!/bin/bash

# Wait for server to be ready
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "Server is ready!"
    exit 0
  fi
  ATTEMPT=$((ATTEMPT + 1))
  echo "Waiting for server... ($ATTEMPT/$MAX_ATTEMPTS)"
  sleep 2
done

echo "Server failed to start within timeout."
exit 1
