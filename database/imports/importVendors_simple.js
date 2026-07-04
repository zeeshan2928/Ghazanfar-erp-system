/**
 * Simple Vendor Import - Works with minimal setup
 * Imports vendor names only
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parse/sync');

const prisma = new PrismaClient();

async function importVendors() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 VENDOR IMPORT - Simple Mode');
  console.log('='.repeat(60) + '\n');

  try {
    // Read CSV
    const filePath = 'database/imports/Vendors.csv';

    if (!fs.existsSync(filePath)) {
      throw new Error(`❌ File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true
    });

    console.log(`✅ Read ${records.length} vendors from CSV\n`);

    if (records.length === 0) {
      console.log('❌ No records found');
      return;
    }

    // Get existing vendors
    const existing = await prisma.vendor.findMany({
      where: { organizationId: 2 },
      select: { name: true }
    });

    const existingNames = new Set(existing.map(v => v.name.toLowerCase().trim()));
    console.log(`✅ Found ${existing.length} existing vendors in database\n`);

    // Filter duplicates
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const record of records) {
      const vendorName = record['Vendor Name'] || record['vendor_name'] || record['Name'];

      if (!vendorName || vendorName.trim() === '') {
        continue;
      }

      const normalizedName = vendorName.toLowerCase().trim();

      if (existingNames.has(normalizedName)) {
        skippedCount++;
        continue;
      }

      try {
        const vendor = await prisma.vendor.create({
          data: {
            organizationId: 2,
            name: vendorName.trim(),
            isActive: true,
            createdAt: new Date()
          }
        });

        insertedCount++;
        existingNames.add(normalizedName);

        if (insertedCount % 10 === 0) {
          console.log(`⏳ Inserted ${insertedCount} vendors...`);
        }
      } catch (err) {
        errors.push({
          vendor: vendorName,
          error: err.message
        });
      }
    }

    // Results
    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`   Total in CSV: ${records.length}`);
    console.log(`   ✅ Inserted: ${insertedCount}`);
    console.log(`   ⏭️  Skipped (existing): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.slice(0, 5).forEach(e => {
        console.log(`   ${e.vendor}: ${e.error}`);
      });
    }

    const totalVendors = await prisma.vendor.count({
      where: { organizationId: 2 }
    });

    console.log(`\n📈 Total vendors in database: ${totalVendors}`);
    console.log('\n✅ Ready for Purchase Orders!\n');

  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

importVendors().catch(console.error);
