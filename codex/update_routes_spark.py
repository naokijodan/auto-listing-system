#!/usr/bin/env python3
"""Insert Spark series imports and registrations into ebay-routes.ts."""

ROUTES_FILE = "/Users/naokijodan/Desktop/rakuda/apps/api/src/routes/ebay-routes.ts"
OUTPUT_DIR = "/Users/naokijodan/Desktop/rakuda/codex/output"

with open(ROUTES_FILE, "r") as f:
    content = f.read()

with open(f"{OUTPUT_DIR}/spark-imports.txt", "r") as f:
    imports = f.read().strip()

with open(f"{OUTPUT_DIR}/spark-registrations.txt", "r") as f:
    registrations = f.read().strip()

# Insert imports before the export function line
content = content.replace(
    "\nexport function registerEbayRoutes",
    f"\n// Phase 2961-3030 (Spark series)\n{imports}\n\nexport function registerEbayRoutes"
)

# Insert registrations before the closing }
# Find the last } which closes the function
last_brace = content.rstrip().rfind("}")
content = (
    content[:last_brace]
    + "\n  // Phase 2961-3030 (Spark series)\n"
    + registrations
    + "\n}\n"
)

with open(ROUTES_FILE, "w") as f:
    f.write(content)

print(f"Updated {ROUTES_FILE}")
print("Added 70 imports + 70 registrations for Spark series")
