#!/usr/bin/env node

/**
 * Setup script for Virtual Office
 * Creates necessary directories and checks prerequisites
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Virtual Office Setup\n');

// Create necessary directories
const directories = [
  'server/uploads',
  'client/public',
  'client/src',
  'client/src/components',
  'client/src/context',
  'client/src/components/Auth',
  'client/src/components/VirtualOffice'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('\n⚠️  .env file not found!');
  console.log('📝 Creating .env from .env.example...');
  
  const envExample = path.join(__dirname, '.env.example');
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envPath);
    console.log('✅ Created .env file');
    console.log('⚠️  Please update .env with your configuration!');
  } else {
    console.log('❌ .env.example not found. Please create .env manually.');
  }
} else {
  console.log('✅ .env file exists');
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion < 16) {
  console.log(`\n⚠️  Node.js version ${nodeVersion} detected.`);
  console.log('   Recommended: Node.js 16 or higher');
} else {
  console.log(`✅ Node.js version: ${nodeVersion}`);
}

// Check if MongoDB is mentioned
console.log('\n📋 Next Steps:');
console.log('1. Make sure MongoDB is installed and running');
console.log('2. Update .env file with your configuration');
console.log('3. Run: npm run install-all');
console.log('4. Run: npm run dev');
console.log('\n✨ Setup complete!');

