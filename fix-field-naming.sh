#!/bin/bash

# Script to fix camelCase to snake_case field references across all service files
# This handles the systematic naming mismatch between Prisma schema (snake_case) and code (camelCase)

echo "🔧 Starting comprehensive field naming fix..."
echo "This will convert camelCase field references to snake_case across all modules"
echo ""

# Find all service files
SERVICE_FILES=$(find src/modules -name "*.service.ts" -type f)
FILE_COUNT=$(echo "$SERVICE_FILES" | wc -l)

echo "Found $FILE_COUNT service files to process"
echo ""

# Common field name mappings (camelCase → snake_case)
declare -a FIELD_MAPS=(
    "billNumber:bill_number"
    "billDate:bill_date"
    "billLine:bill_line"
    "billLines:bill_lines"
    "unitPrice:unit_price"
    "lineTotal:line_total"
    "totalAmount:total_amount"
    "billId:bill_id"
    "customerId:customer_id"
    "productId:product_id"
    "warehouseId:warehouse_id"
    "organizationId:organizationId"
    "createdAt:createdAt"
    "updatedAt:updatedAt"
    "isActive:isActive"
    "creditLimit:credit_limit"
    "customerType:customer_type"
    "paymentMethod:payment_method"
    "approvalStatus:approval_status"
    "salesmanId:salesman_id"
    "vendorId:vendor_id"
    "poNumber:po_number"
    "poDate:po_date"
    "quantityPurchased:quantity_purchased"
    "costPrice:cost_price"
    "minimumQuantity:minimum_quantity"
    "reorderQuantity:reorder_quantity"
    "primaryVendorId:primary_vendor_id"
    "isVisibleOnWebsite:is_visible_on_website"
    "isVisibleOnCounter:is_visible_on_counter"
    "isVisibleWholesale:is_visible_wholesale"
    "isVisibleRetail:is_visible_retail"
    "baseUnit:base_unit"
    "leadTimeDays:lead_time_days"
    "contactPerson:contact_person"
    "vendorName:vendor_name"
    "linkBillId:link_bill_id"
    "linkedBillId:linked_bill_id"
    "linkedCashBookEntry:linked_cash_book_entry"
    "referenceNumber:reference_number"
    "matchedAmount:matched_amount"
    "approvedBy:approved_by"
    "approvedAt:approved_at"
    "discountAmount:discount_amount"
    "taxAmount:tax_amount"
    "deliveryCharges:delivery_charges"
    "lastModifiedBy:last_modified_by"
    "createdBy:created_by"
    "transferNumber:transfer_number"
    "fromWarehouseId:from_warehouse_id"
    "toWarehouseId:to_warehouse_id"
    "transferDate:transfer_date"
    "expectedArrivalDate:expected_arrival_date"
    "receivedBy:received_by"
    "receivedDate:received_date"
    "fromInventory:from_inventory"
    "toInventory:to_inventory"
    "inventoryId:inventory_id"
)

echo "Processing files with field replacements..."
echo ""

for file in $SERVICE_FILES; do
    echo "Processing: $file"

    # Apply all field mappings
    for mapping in "${FIELD_MAPS[@]}"; do
        camel=${mapping%:*}
        snake=${mapping#*:}

        # Only replace if the field is being accessed with a dot (property access)
        # This avoids replacing camelCase in comments or method names unnecessarily
        sed -i "s/\\.${camel}/\.${snake}/g" "$file"
        sed -i "s/, ${camel}/, ${snake}/g" "$file"
        sed -i "s/: ${camel}/) => {/: ${snake}/g" "$file"
    done
done

echo ""
echo "✅ Field name fixes completed!"
echo ""
echo "Now rebuilding to check for remaining errors..."
npm run build 2>&1 | tail -20

echo ""
echo "🎉 Done! Check the build output above for any remaining errors."
