#!/bin/sh
# =============================================================================
# RAKUDA Docker Entrypoint
# =============================================================================
set -e

echo "=== RAKUDA Container Startup ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Timestamp: $(date -Iseconds)"

# First argument is the service type (api/worker)
SERVICE_TYPE=$1
shift

# Run database migrations if RUN_MIGRATIONS is true or if this is the API service
if [ "$RUN_MIGRATIONS" = "true" ] || [ "$SERVICE_TYPE" = "api" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy --schema=packages/database/prisma/schema 2>&1 || echo "Migration warning: some migrations may have failed"
  echo "Migrations complete."
fi

echo "Starting application..."
echo "Command: $@"
exec "$@"
