const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getTableColumns() {
  try {
    const tables = ['Bill', 'BillLine', 'GatePass', 'GatePassItem', 'Inventory'];

    for (const tableName of tables) {
      console.log(`\n\n========== TABLE: ${tableName} ==========`);

      // Query actual database columns - using case-insensitive ILIKE or checking against information_schema.tables
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default, is_identity
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      console.log(`\nActual Database Columns for ${tableName}:`);
      if (result.length === 0) {
        console.log('TABLE NOT FOUND IN DATABASE');
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

getTableColumns();
