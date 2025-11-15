/**
 * Script to create the mentorship_db database
 * Run with: node scripts/create-database.js
 * 
 * This script uses the mysql command-line tool directly
 */

const { exec } = require('child_process');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function createDatabase() {
  try {
    console.log('=== Database Setup Script ===\n');
    console.log('This script will help you create the mentorship_db database.\n');
    
    // Get database credentials
    const username = await question('MySQL username (default: root): ') || 'root';
    const password = await question('MySQL password: ');
    
    if (!password) {
      console.log('\n⚠️  No password provided. Trying without password...');
    }
    
    const dbName = 'mentorship_db';
    const sqlCommand = `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;
    
    // Build mysql command
    let mysqlCommand;
    if (password) {
      mysqlCommand = `mysql -u ${username} -p${password} -e "${sqlCommand}"`;
    } else {
      mysqlCommand = `mysql -u ${username} -e "${sqlCommand}"`;
    }
    
    console.log('\n🔄 Creating database...');
    
    try {
      await execCommand(mysqlCommand);
      console.log(`✅ Database '${dbName}' created successfully!`);
    } catch (err) {
      // If command fails, try interactive mode
      console.log('\n⚠️  Direct command failed. Trying interactive mode...');
      console.log('\nPlease run this command manually:');
      console.log(`mysql -u ${username} -p`);
      console.log(`Then run: ${sqlCommand}`);
      console.log('\nOr use this one-liner:');
      if (password) {
        console.log(`mysql -u ${username} -p${password} -e "${sqlCommand}"`);
      } else {
        console.log(`mysql -u ${username} -e "${sqlCommand}"`);
      }
      rl.close();
      return;
    }
    
    // Verify database was created
    console.log('\n🔄 Verifying database...');
    let verifyCommand;
    if (password) {
      verifyCommand = `mysql -u ${username} -p${password} -e "SHOW DATABASES LIKE '${dbName}';"`;
    } else {
      verifyCommand = `mysql -u ${username} -e "SHOW DATABASES LIKE '${dbName}';"`;
    }
    
    try {
      const { stdout } = await execCommand(verifyCommand);
      if (stdout.includes(dbName)) {
        console.log('✅ Database verified!');
      }
    } catch (err) {
      console.log('⚠️  Could not verify database, but it may have been created.');
    }
    
    console.log('\n✅ Database setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Make sure your .env file has the correct DATABASE_URL');
    console.log('2. Run: npm run db:push');
    console.log('3. Run: npm run db:seed (optional)');
    console.log('4. Restart your server');
    
    rl.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    console.error('\n💡 Alternative: Run this command manually:');
    console.error('mysql -u root -p');
    console.error('Then run: CREATE DATABASE mentorship_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    rl.close();
    process.exit(1);
  }
}

createDatabase();

