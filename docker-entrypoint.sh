#!/bin/sh
# =============================================================================
# RAKUDA Docker Entrypoint
# =============================================================================
set -e

echo "=== RAKUDA Container Startup ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Timestamp: $(date -Iseconds)"

# Skip entrypoint checks, start application directly
echo "Starting application..."
echo "Command: $@"
exec "$@"
