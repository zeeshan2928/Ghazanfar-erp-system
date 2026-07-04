/**
 * Vendor Import Script
 * Imports vendor data from Excel CSV export
 * Creates: Vendors, Vendor Categories, Vendor Payment Terms, Vendor Products
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parse/sync');

const prisma = new PrismaClient();

async function importVendors() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 VENDOR IMPORT - Starting...');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Read CSV
    const filePath = 'database/imports/Vendors.csv';

    if (!fs.existsSync(filePath)) {
      throw new Error(`❌ File not found: ${filePath}\n\nPlace your Vendors.csv in database/imports/ folder`);
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
      console.log('❌ No records found. Check CSV file format.');
      return;
    }

    // Step 2: Get or create vendor categories
    console.log('📦 Setting up vendor categories...');
    const categories = await getOrCreateCategories();
    console.log(`✅ Categories ready: ${Object.keys(categories).join(', ')}\n`);

    // Step 3: Validate and transform data
    console.log('🔍 Validating vendor data...\n');
    const validRecords = [];
    const invalidRecords = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 because CSV starts at row 2

      // Get vendor name (handle different column name variations)
      const vendorName = record['Vendor Name'] || record['vendor_name'] || record['Name'] || '';

      // Required field validation
      const errors = [];

      if (!vendorName || vendorName.trim() === '') {
        errors.push('Missing Vendor Name (required)');
      }

      if (errors.length > 0) {
        invalidRecords.push({
          rowNum,
          vendor: vendorName || '?',
          errors: errors.join('; ')
        });
        continue;
      }

      validRecords.push({
        rowNum,
        vendorName: vendorName.trim(),
        ...record
      });
    }

    console.log(`📊 Validation Summary:`);
    console.log(`   ✅ Valid records: ${validRecords.length}`);
    console.log(`   ❌ Invalid records: ${invalidRecords.length}\n`);

    if (invalidRecords.length > 0) {
      console.log('❌ Invalid Records:');
      invalidRecords.slice(0, 10).forEach(r => {
        console.log(`   Row ${r.rowNum}: ${r.vendor}`);
        console.log(`     → ${r.errors}`);
      });
      if (invalidRecords.length > 10) {
        console.log(`   ... and ${invalidRecords.length - 10} more\n`);
      }
    }

    // Step 4: Check for duplicates
    console.log('\n🔎 Checking for duplicates...');
    const existingVendors = await prisma.vendor.findMany({
      where: { organizationId: 2 },
      select: { id: true, name: true }
    });

    const existingVendorNames = new Set(existingVendors.map(v => v.name.toLowerCase().trim()));

    let duplicateCount = 0;
    const recordsToInsert = validRecords.filter(r => {
      const vendorName = r.vendorName.toLowerCase().trim();
      if (existingVendorNames.has(vendorName)) {
        duplicateCount++;
        return false;
      }
      return true;
    });

    console.log(`✅ Found ${duplicateCount} duplicate vendors (will skip)\n`);

    // Step 5: Insert vendors
    console.log('💾 Inserting vendors into database...\n');
    let insertedCount = 0;
    const insertionErrors = [];

    for (const record of recordsToInsert) {
      try {
        // Determine vendor category
        const category = record['Category'] || record['Vendor Type'] || 'Wholesaler';
        const categoryId = categories[normalizeCategory(category)]?.id || categories['Wholesaler'].id;

        // Create vendor
        const vendor = await prisma.vendor.create({
          data: {
            organizationId: 2,
            name: record.vendorName,
            contactPerson: record['Contact Person'] || record['Contact Name'] || null,
            phone: record['Phone'] || record['Mobile'] || null,
            email: record['Email'] || null,
            address: record['Address'] || record['City'] || null,
            bankAccountDetails: record['Bank Account'] || record['Bank Details'] || null,
            status: record['Status'] === 'Inactive' ? 'INACTIVE' : 'ACTIVE',
            createdAt: new Date()
          }
        });

        // Create vendor category assignment if different from default
        if (categoryId !== categories['Wholesaler'].id) {
          // Note: Current schema doesn't have vendor_vendor_category junction
          // This is for future use
        }

        // Create payment terms if specified
        if (record['Payment Terms'] || record['Days Allowed']) {
          const termsLabel = record['Payment Terms'] || `Net ${record['Days Allowed'] || 30}`;
          const daysAllowed = parseInt(record['Days Allowed']) || 30;

          await prisma.vendorPaymentTerm.create({
            data: {
              organizationId: 2,
              vendorId: vendor.id,
              termType: termsLabel,
              daysAllowed: daysAllowed,
              description: record['Payment Terms Description'] || null
            }
          });
        }

        // Create vendor performance record if data provided
        if (record['Quality Rating'] || record['On Time Delivery %']) {
          await prisma.vendorPerformance.create({
            data: {
              organizationId: 2,
              vendorId: vendor.id,
              onTimeDeliveryPercentage: parsePercentage(record['On Time Delivery %']),
              qualityRating: parseDecimal(record['Quality Rating']),
              lastAssessmentDate: new Date(),
              overallScore: calculateOverallScore(
                parsePercentage(record['On Time Delivery %']),
                parseDecimal(record['Quality Rating'])
              )
            }
          });
        }

        insertedCount++;

        if (insertedCount % 5 === 0) {
          console.log(`⏳ Inserted ${insertedCount} vendors...`);
        }

      } catch (err) {
        insertionErrors.push({
          vendor: record.vendorName,
          error: err.message
        });
        console.error(`❌ Error inserting ${record.vendorName}: ${err.message}`);
      }
    }

    // Step 6: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ VENDOR IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`   Total records in CSV: ${records.length}`);
    console.log(`   Valid format: ${validRecords.length}`);
    console.log(`   Duplicates skipped: ${duplicateCount}`);
    console.log(`   Successfully inserted: ${insertedCount}`);
    console.log(`   Insertion errors: ${insertionErrors.length}`);
    console.log(`   Invalid format: ${invalidRecords.length}`);

    if (insertionErrors.length > 0) {
      console.log('\n❌ Insertion Errors:');
      insertionErrors.forEach(e => {
        console.log(`   ${e.vendor}: ${e.error}`);
      });
    }

    // Step 7: Reconciliation
    const totalVendors = await prisma.vendor.count({
      where: { organizationId: 2 }
    });

    const totalPaymentTerms = await prisma.vendorPaymentTerm.count({
      where: { organizationId: 2 }
    });

    const totalPerformance = await prisma.vendorPerformance.count({
      where: { organizationId: 2 }
    });

    console.log('\n📈 Database Status:');
    console.log(`   Total vendors: ${totalVendors}`);
    console.log(`   Payment terms created: ${totalPaymentTerms}`);
    console.log(`   Performance records: ${totalPerformance}`);

    console.log('\n✅ Ready for Purchase Orders!\n');

  } catch (err) {
    console.error('❌ FATAL ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Helper: Create default vendor categories
 */
async function getOrCreateCategories() {
  const defaultCategories = [
    { name: 'Wholesaler', description: 'Bulk wholesalers' },
    { name: 'Distributor', description: 'Regional distributors' },
    { name: 'Manufacturer', description: 'Direct manufacturers' },
    { name: 'Supplier', description: 'General suppliers' },
    { name: 'Service Provider', description: 'Service-based vendors' }
  ];

  const categories = {};

  for (const cat of defaultCategories) {
    let category = await prisma.vendorCategory.findFirst({
      where: {
        organizationId: 2,
        name: cat.name
      }
    });

    if (!category) {
      category = await prisma.vendorCategory.create({
        data: {
          organizationId: 2,
          name: cat.name,
          description: cat.description
        }
      });
    }

    categories[cat.name] = category;
  }

  return categories;
}

/**
 * Helper: Normalize category names
 */
function normalizeCategory(categoryStr) {
  if (!categoryStr) return 'Wholesaler';

  const str = categoryStr.toLowerCase().trim();

  if (str.includes('wholesal')) return 'Wholesaler';
  if (str.includes('distribut')) return 'Distributor';
  if (str.includes('manufactur')) return 'Manufacturer';
  if (str.includes('service')) return 'Service Provider';

  return 'Supplier';
}

/**
 * Helper: Parse percentage values
 */
function parsePercentage(percentStr) {
  if (!percentStr) return 0;

  const str = percentStr.toString().replace(/%/g, '').trim();
  const num = parseFloat(str);

  return isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
}

/**
 * Helper: Parse decimal values
 */
function parseDecimal(decimalStr) {
  if (!decimalStr) return 0;

  const str = decimalStr.toString().replace(/[^\d.]/g, '').trim();
  const num = parseFloat(str);

  return isNaN(num) ? 0 : Math.min(5, Math.max(0, num));
}

/**
 * Helper: Calculate overall score
 */
function calculateOverallScore(deliveryPercentage, qualityRating) {
  if (!deliveryPercentage && !qualityRating) return 0;

  // Convert delivery percentage to 1-5 scale
  const deliveryScore = (deliveryPercentage / 100) * 5;

  // Average the two scores
  const count = (deliveryPercentage ? 1 : 0) + (qualityRating ? 1 : 0);
  if (count === 0) return 0;

  return (deliveryScore + (qualityRating || 0)) / count;
}

// Run import
importVendors().catch(console.error);
