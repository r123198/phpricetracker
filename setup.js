const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Philippine Market Price Tracker API\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
    console.log('⚠️  Please edit .env file with your database credentials and API key');
  } else {
    console.log('❌ env.example file not found. Please create a .env file manually.');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully!');
  } catch (error) {
    console.log('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed');
}

// Check if Prisma client is generated
const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma');
if (!fs.existsSync(prismaClientPath)) {
  console.log('🔧 Generating Prisma client...');
  try {
    execSync('npm run db:generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated successfully!');
  } catch (error) {
    console.log('❌ Failed to generate Prisma client:', error.message);
    console.log('⚠️  Make sure your DATABASE_URL is configured in .env file');
    process.exit(1);
  }
} else {
  console.log('✅ Prisma client already generated');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Edit .env file with your database credentials');
console.log('2. Run: npm run db:push (to create database tables)');
console.log('3. Run: npm run db:seed (to populate with sample data)');
console.log('4. Run: npm run dev (to start development server)');
console.log('5. Run: npm test (to test the API)');
console.log('\n📚 API Documentation will be available at: http://localhost:3000/docs');
console.log('🏥 Health Check will be available at: http://localhost:3000/health'); 