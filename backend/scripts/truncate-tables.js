const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function truncateAllTables() {
  try {
    console.log('Starting to truncate all tables...');

    // Disable foreign key checks
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`;

    // Get all table names
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME != '_prisma_migrations';
    `;

    // Truncate each table
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`Truncating table: ${tableName}`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${tableName}\`;`);
    }

    // Re-enable foreign key checks
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1;`;

    console.log('✅ All tables truncated successfully!');
  } catch (error) {
    console.error('❌ Error truncating tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

truncateAllTables();