#!/bin/bash

# Kill processes on development ports
ports=(3001 5051 5100 5173 5174 5175 5555)

for port in "${ports[@]}"; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Killing process on port $port (PID: $pid)"
    kill -9 $pid 2>/dev/null
  fi
done

echo "All ports cleared."
