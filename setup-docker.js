#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up PH Price Tracker with Docker PostgreSQL...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  
  const envContent = `# Database Configuration (Docker)
DATABASE_URL="postgresql://postgres:password@localhost:5432/ph_price_tracker"

# Server Configuration
PORT=3000
NODE_ENV=development

# Security
ADMIN_API_KEY="dev-admin-api-key-12345"
JWT_SECRET="dev-jwt-secret-key-12345"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
} else {
  console.log('✅ .env file already exists');
}

console.log('\n📋 Next steps:');
console.log('1. Make sure Docker is installed and running');
console.log('2. Run: npm run docker:up');
console.log('3. Run: npm run db:setup');
console.log('4. Run: npm run dev');
console.log('\n🎯 Or run everything at once with: npm run db:setup && npm run dev'); 