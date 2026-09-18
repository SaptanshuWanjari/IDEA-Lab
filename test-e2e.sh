#!/bin/bash
set -e

echo "Starting backend infrastructure..."
make setup

echo "Waiting for API to be healthy..."
for i in {1..30}; do
  if curl -s http://localhost:8000/health | grep -q '"status":"ok"'; then
    echo "API is healthy!"
    break
  fi
  sleep 2
  if [ $i -eq 30 ]; then
    echo "API failed to start within 60s"
    make down
    exit 1
  fi
done

echo "Running E2E tests..."
cd frontend
npm run test:e2e
TEST_EXIT_CODE=$?
cd ..

echo "Tearing down backend infrastructure..."
make down

exit $TEST_EXIT_CODE
