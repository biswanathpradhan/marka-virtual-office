#!/bin/bash

# Virtual Office Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
echo "🚀 Deploying Virtual Office ($ENVIRONMENT)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file with required configuration."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
npm run install-all

echo -e "${YELLOW}🗄️  Step 2: Running database migrations...${NC}"
npm run migrate

echo -e "${YELLOW}📁 Step 3: Creating required directories...${NC}"
mkdir -p server/uploads
mkdir -p server/recordings
chmod 755 server/uploads server/recordings

echo -e "${YELLOW}🏗️  Step 4: Building React application...${NC}"
npm run build

echo -e "${YELLOW}🔄 Step 5: Restarting application...${NC}"
if pm2 list | grep -q "virtual-office"; then
    echo "Restarting existing PM2 process..."
    pm2 restart virtual-office
else
    echo "Starting new PM2 process..."
    pm2 start server/index.js --name virtual-office
    pm2 save
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Application Status:"
pm2 status virtual-office
echo ""
echo "📝 View logs: pm2 logs virtual-office"
echo "📊 Monitor: pm2 monit"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Change super admin password: admin@virtualoffice.com / Admin@123"
echo "2. Verify HTTPS is configured"
echo "3. Check firewall rules"
echo "4. Set up automated backups"

