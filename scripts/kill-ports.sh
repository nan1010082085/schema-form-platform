#!/bin/bash

# Kill processes on fixed development ports
PORTS=(3001 5050 5100 5200 5300 5400)

for port in "${PORTS[@]}"; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Killing process on port $port (PID: $pid)"
    kill -9 $pid 2>/dev/null
  fi
done

echo "All ports cleared."
