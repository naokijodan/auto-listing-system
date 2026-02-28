#!/bin/sh
# =============================================================================
# RAKUDA Docker Entrypoint
# =============================================================================
set -e

echo "=== RAKUDA Container Startup ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Timestamp: $(date -Iseconds)"

# First argument is the service type (api/worker), skip it
shift

echo "Starting application..."
echo "Command: $@"
exec "$@"
