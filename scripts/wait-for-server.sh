#!/bin/bash

# Wait for the backend server to be ready
MAX_RETRIES=30
RETRY_INTERVAL=1

echo "Waiting for server to be ready..."

for i in $(seq 1 $MAX_RETRIES); do
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "Server is ready!"
    exit 0
  fi
  echo "Attempt $i/$MAX_RETRIES: Server not ready yet..."
  sleep $RETRY_INTERVAL
done

echo "Server failed to start within $MAX_RETRIES seconds"
exit 1
