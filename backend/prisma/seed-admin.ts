/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting admin account seeding...');

  // Hash password for admin
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // Get admin email from environment or use default
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminName = process.env.ADMIN_NAME || 'Admin User';

  // Check if admin already exists using raw SQL to avoid schema issues
  const existingAdmin = await prisma.$queryRaw<any[]>`
    SELECT id, email, name FROM users WHERE email = ${adminEmail} LIMIT 1
  `;

  if (existingAdmin && existingAdmin.length > 0) {
    console.log(`⚠️  Admin with email ${adminEmail} already exists.`);
    console.log('   Updating admin account...');
    
    // Update existing admin using raw SQL to avoid missing column issues
    await prisma.$executeRaw`
      UPDATE users 
      SET name = ${adminName},
          passwordHash = ${passwordHash},
          role = 'ADMIN',
          status = 'ACTIVE',
          verified = true,
          updatedAt = NOW()
      WHERE email = ${adminEmail}
    `;

    console.log('✅ Admin account updated successfully!');
    console.log(`\n📝 Admin credentials:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${defaultPassword}`);
    return;
  }

  // Create Admin User using raw SQL to avoid missing column issues
  console.log('👤 Creating admin user...');
  
  // Generate a unique ID (cuid-like format: cl + timestamp + random)
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  const userId = `cl${timestamp}${random}`;
  
  await prisma.$executeRaw`
    INSERT INTO users (id, name, email, passwordHash, role, status, verified, createdAt, updatedAt)
    VALUES (
      ${userId},
      ${adminName},
      ${adminEmail},
      ${passwordHash},
      'ADMIN',
      'ACTIVE',
      1,
      NOW(),
      NOW()
    )
  `;

  console.log('✅ Admin account created successfully!');
  console.log(`\n📝 Admin credentials:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${defaultPassword}`);
  console.log(`\n💡 You can set custom credentials using environment variables:`);
  console.log(`   ADMIN_EMAIL=your-email@example.com`);
  console.log(`   ADMIN_PASSWORD=your-secure-password`);
  console.log(`   ADMIN_NAME=Your Name`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding admin account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

