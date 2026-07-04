const fs = require('fs');

/**
 * Transform extracted products - SIMPLIFIED VERSION
 * Only imports: Product Name, SKU, Vendor
 *
 * Skips: Price, Cost, Quantity
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
  issues: []
};

// Read input file
const rows = parseCSV('Extracted_Products_Summary.csv');
console.log(`📖 Read ${rows.length} rows from CSV\n`);

// Process rows
const outputRows = [];
outputRows.push('Product Name,SKU,Vendor');

rows.forEach((row, idx) => {
  stats.total++;

  const productName = row['Product Name'] || '';
  const primaryVendor = row['Primary_Vendor'] || '';

  // Validation
  if (!productName || productName === '' || productName === '+') {
    stats.skipped++;
    stats.issues.push(`Row ${stats.total}: Invalid product name`);
    return;
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

  // Escape product name for CSV
  const escapedName = `"${productName.replace(/"/g, '""')}"`;

  // Add row: Name, SKU, Vendor only
  outputRows.push(`${escapedName},${sku},${vendor}`);

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
console.log('✅ PRODUCT PREPARATION COMPLETE');
console.log('='.repeat(70));
console.log(`\n📊 Statistics:`);
console.log(`   Total rows read:         ${stats.total}`);
console.log(`   Valid products:          ${stats.valid}`);
console.log(`   Skipped (invalid):       ${stats.skipped}`);
console.log(`\n📋 Fields Included:`);
console.log(`   ✅ Product Name`);
console.log(`   ✅ SKU (auto-generated)`);
console.log(`   ✅ Vendor (mapped to 86 existing vendors)`);
console.log(`\n📁 Output File:  ${outputFile}`);
console.log(`\n🚀 Next Step:`);
console.log(`   node database/imports/importProducts.js\n`);
console.log('='.repeat(70));

if (stats.issues.length > 0) {
  console.log(`\n⚠️  Issues found:`);
  stats.issues.slice(0, 10).forEach(issue => console.log(`   ${issue}`));
  if (stats.issues.length > 10) {
    console.log(`   ... and ${stats.issues.length - 10} more`);
  }
}
