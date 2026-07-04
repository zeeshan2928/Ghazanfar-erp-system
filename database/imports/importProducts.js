/**
 * Import Products from CSV
 * Format: Product Name, SKU, Vendor
 *
 * Usage: node database/imports/importProducts.js
 */

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ORGANIZATION_ID = 2;

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle quoted fields with commas
    const match = line.match(/"([^"]*)"|([^,]*)/g);
    if (!match) continue;

    const values = match.map(v => v.replace(/^"|"$/g, '').trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

async function importProducts() {
  const stats = {
    total: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    duplicates: 0
  };

  const productMap = new Map();

  try {
    const rows = parseCSV('database/imports/Products.csv');
    console.log(`📖 Found ${rows.length} products to import\n`);

    for (const row of rows) {
      stats.total++;

      const {
        'Product Name': productName,
        'SKU': sku,
        'Vendor': vendorName
      } = row;

      // Validation
      if (!productName || !sku) {
        stats.skipped++;
        stats.errors.push(`Row ${stats.total}: Missing name or SKU`);
        continue;
      }

      // Check for duplicate (by SKU)
      const key = sku.toLowerCase();
      if (productMap.has(key)) {
        stats.duplicates++;
        stats.skipped++;
        console.log(`⏭️  Duplicate SKU: ${sku}`);
        continue;
      }

      // Find vendor
      let vendorId = null;
      if (vendorName && vendorName.trim()) {
        const vendor = await prisma.vendor.findFirst({
          where: {
            name: vendorName.trim(),
            organizationId: ORGANIZATION_ID
          }
        });

        if (vendor) {
          vendorId = vendor.id;
        } else {
          stats.errors.push(`Row ${stats.total}: Vendor not found: "${vendorName}"`);
        }
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          organizationId: ORGANIZATION_ID,
          code: sku.trim(),
          name: productName.trim(),
          costPrice: 0,
          isVisibleOnCounter: true,
          isVisibleOnWebsite: false,
          isVisibleWholesale: true,
          isVisibleRetail: true,
          baseUnit: 'piece',
          minimumQuantity: 0,
          reorderQuantity: 0,
          primaryVendorId: vendorId,
          isActive: true
        }
      });

      productMap.set(key, product.id);
      stats.imported++;

      if (stats.imported % 200 === 0) {
        process.stdout.write(`\r✅ Imported ${stats.imported} products...`);
      }
    }

    console.log(`\n\n` + '='.repeat(70));
    console.log('✅ IMPORT COMPLETE');
    console.log('='.repeat(70));
    console.log(`\n📊 Results:`);
    console.log(`   Total rows:     ${stats.total}`);
    console.log(`   Imported:       ${stats.imported}`);
    console.log(`   Duplicates:     ${stats.duplicates}`);
    console.log(`   Skipped:        ${stats.skipped}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Issues (first 10):`);
      stats.errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more`);
      }
    }

    console.log('='.repeat(70));

    // Verify import
    const count = await prisma.product.count({
      where: { organizationId: ORGANIZATION_ID }
    });
    console.log(`\n✅ Database verification: ${count} products in database\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

importProducts();
