const fs = require('fs');
const path = require('path');

/**
 * Transform extracted products summary into import format
 * Uses native Node.js CSV parsing (no external dependencies)
 */

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

const stats = {
  total: 0,
  valid: 0,
  skipped: 0,
  zeroQty: 0,
  issues: []
};

// Read input file
const rows = parseCSV('Extracted_Products_Summary.csv');
console.log(`📖 Read ${rows.length} rows from CSV\n`);

// Process rows
const outputRows = [];
outputRows.push('Product Name,SKU,Category,Price,Cost,Quantity,Active,Vendor');

rows.forEach((row, idx) => {
  stats.total++;

  const productName = row['Product Name'] || '';
  const totalQty = row['Total_Quantity'] || '0';
  const avgPrice = row['Average_Price_PKR'] || '0';
  const primaryVendor = row['Primary_Vendor'] || '';

  // Validation
  if (!productName || productName === '' || productName === '+') {
    stats.skipped++;
    stats.issues.push(`Row ${stats.total}: Invalid product name`);
    return;
  }

  const quantity = parseInt(totalQty) || 0;
  const price = parseFloat(avgPrice) || 0;

  // Track zero quantity items
  if (quantity === 0) {
    stats.zeroQty++;
  }

  // Handle vendor mapping
  const vendor = ['Opening Stock', 'opening stock'].includes(primaryVendor.toLowerCase())
    ? ''
    : primaryVendor;

  // Generate SKU
  const namePrefix = productName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase() || 'PRD';
  const sku = `${namePrefix}-${String(stats.valid + 1).padStart(5, '0')}`;

  // Cost assumption (50% margin)
  const cost = Math.round(price * 0.5);

  // Escape product name for CSV
  const escapedName = `"${productName.replace(/"/g, '""')}"`;

  // Add row
  outputRows.push(
    `${escapedName},${sku},,${price},${cost},${quantity},true,${vendor}`
  );

  stats.valid++;

  if (stats.valid % 500 === 0) {
    process.stdout.write(`\r✓ Processing... ${stats.valid} products`);
  }
});

// Write output file
const outputFile = 'database/imports/Products.csv';
fs.writeFileSync(outputFile, outputRows.join('\n') + '\n');

// Print summary
console.log('\n\n' + '='.repeat(70));
console.log('✅ PRODUCT TRANSFORMATION COMPLETE');
console.log('='.repeat(70));
console.log(`\n📊 Statistics:`);
console.log(`   Total rows read:         ${stats.total}`);
console.log(`   Valid products:          ${stats.valid}`);
console.log(`   Skipped (invalid):       ${stats.skipped}`);
console.log(`   Zero-quantity items:     ${stats.zeroQty} ✓ (included as per requirement)`);
console.log(`\n📁 Output File:  ${outputFile}`);
console.log(`\n🚀 Next Step:`);
console.log(`   node database/imports/importProducts.js\n`);
console.log('='.repeat(70));

if (stats.issues.length > 0) {
  console.log(`\n⚠️  Issues found (showing first 20):`);
  stats.issues.slice(0, 20).forEach(issue => console.log(`   ${issue}`));
  if (stats.issues.length > 20) {
    console.log(`   ... and ${stats.issues.length - 20} more`);
  }
}
