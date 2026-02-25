"""Generate import and registration text blocks for eBay Elite series phases 2191-2260."""

FILE_NAMES = [
    "ebay-listing-intelligence-management-elite",
    "ebay-order-automation-management-elite",
    "ebay-inventory-forecasting-management-elite",
    "ebay-seller-analytics-management-elite",
    "ebay-product-optimization-management-elite",
    "ebay-listing-dynamic-pricing-elite",
    "ebay-order-tracking-management-elite",
    "ebay-inventory-sync-management-elite",
    "ebay-seller-reputation-management-elite",
    "ebay-product-bundle-management-elite",
    "ebay-listing-ab-testing-elite",
    "ebay-order-refund-management-elite",
    "ebay-inventory-alert-management-elite",
    "ebay-seller-dashboard-management-elite",
    "ebay-product-category-management-elite",
    "ebay-listing-template-optimization-elite",
    "ebay-order-shipping-management-elite",
    "ebay-inventory-restock-management-elite",
    "ebay-seller-communication-management-elite",
    "ebay-product-image-optimization-elite",
    "ebay-listing-keyword-management-elite",
    "ebay-order-cancellation-management-elite",
    "ebay-inventory-location-management-elite",
    "ebay-seller-policy-management-elite",
    "ebay-product-specification-management-elite",
    "ebay-listing-cross-border-elite",
    "ebay-order-bulk-management-elite",
    "ebay-inventory-cycle-count-elite",
    "ebay-seller-tax-management-elite",
    "ebay-product-condition-management-elite",
    "ebay-listing-seasonal-management-elite",
    "ebay-order-warranty-management-elite",
    "ebay-inventory-shelf-management-elite",
    "ebay-seller-integration-management-elite",
    "ebay-product-barcode-management-elite",
    "ebay-listing-competitor-analysis-elite",
    "ebay-order-payment-processing-elite",
    "ebay-inventory-batch-management-elite",
    "ebay-seller-account-management-elite",
    "ebay-product-label-management-elite",
    "ebay-listing-performance-tracking-elite",
    "ebay-order-delivery-management-elite",
    "ebay-inventory-movement-management-elite",
    "ebay-seller-compliance-tracking-elite",
    "ebay-product-warranty-management-elite",
    "ebay-listing-geo-targeting-elite",
    "ebay-order-feedback-management-elite",
    "ebay-inventory-cost-management-elite",
    "ebay-seller-reporting-management-elite",
    "ebay-product-review-analysis-elite",
    "ebay-listing-automation-workflow-elite",
    "ebay-order-archive-management-elite",
    "ebay-inventory-valuation-management-elite",
    "ebay-seller-subscription-management-elite",
    "ebay-product-catalog-sync-elite",
    "ebay-listing-split-testing-elite",
    "ebay-order-status-management-elite",
    "ebay-inventory-threshold-management-elite",
    "ebay-seller-notification-management-elite",
    "ebay-product-pricing-strategy-elite",
    "ebay-listing-recommendation-elite",
    "ebay-order-dispute-resolution-elite",
    "ebay-inventory-demand-planning-elite",
    "ebay-seller-performance-tracking-elite",
    "ebay-product-search-optimization-elite",
    "ebay-listing-market-analysis-elite",
    "ebay-order-logistics-optimization-elite",
    "ebay-inventory-supply-chain-elite",
    "ebay-seller-growth-analytics-elite",
    "ebay-product-data-management-elite",
]

START_PHASE = 2191
GROUP_SIZE = 5
OUTPUT_DIR = "/Users/naokijodan/Desktop/rakuda/codex/output"


def kebab_to_camel(kebab: str) -> str:
    """Convert kebab-case to camelCase and append 'Router'."""
    parts = kebab.split("-")
    camel = parts[0] + "".join(word.capitalize() for word in parts[1:])
    return camel + "Router"


def main():
    assert len(FILE_NAMES) == 70, f"Expected 70 file names, got {len(FILE_NAMES)}"

    import_lines = []
    registration_lines = []

    for i, name in enumerate(FILE_NAMES):
        var_name = kebab_to_camel(name)
        import_lines.append(f"import {var_name} from './{name}';")

    for group_start in range(0, len(FILE_NAMES), GROUP_SIZE):
        group_end = min(group_start + GROUP_SIZE, len(FILE_NAMES))
        phase_start = START_PHASE + group_start
        phase_end = START_PHASE + group_end - 1
        registration_lines.append(f"// Phase {phase_start}-{phase_end}")
        for i in range(group_start, group_end):
            name = FILE_NAMES[i]
            var_name = kebab_to_camel(name)
            registration_lines.append(f"app.use('/api/{name}', {var_name});")
        registration_lines.append("")  # blank line between groups

    imports_text = "\n".join(import_lines) + "\n"
    registrations_text = "\n".join(registration_lines).rstrip() + "\n"

    imports_path = f"{OUTPUT_DIR}/elite-imports.txt"
    registrations_path = f"{OUTPUT_DIR}/elite-registrations.txt"

    with open(imports_path, "w") as f:
        f.write(imports_text)

    with open(registrations_path, "w") as f:
        f.write(registrations_text)

    print(f"Written {len(FILE_NAMES)} import lines to {imports_path}")
    print(f"Written registration blocks to {registrations_path}")
    print(f"Phases: {START_PHASE}-{START_PHASE + len(FILE_NAMES) - 1}")


if __name__ == "__main__":
    main()
