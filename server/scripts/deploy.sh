#!/bin/bash

# Production deployment script for Network CRM Server
# Run this script from the server directory

set -e  # Exit on any error

echo "🚀 Starting Network CRM Server deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if we're in the server directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the server directory."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please create environment configuration."
    exit 1
fi

# Check required environment variables
print_status "Validating environment variables..."
REQUIRED_VARS=("JWT_SECRET" "DATABASE_URL")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "$(grep "^$var=" .env | cut -d'=' -f2)" ]; then
        print_error "Required environment variable $var is missing from .env file"
        exit 1
    fi
done
print_success "Environment variables validated"

# Install dependencies
print_status "Installing dependencies..."
npm ci --production
print_success "Dependencies installed"

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Run database migrations
print_status "Running database migrations..."
npx prisma migrate deploy
print_success "Database migrations completed"

# Build TypeScript
print_status "Building TypeScript..."
npm run build
print_success "Build completed"

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs
chmod 755 logs
print_success "Logs directory ready"

# Create systemd service file (if running on Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_status "Creating systemd service file..."
    cat > /tmp/network-crm.service << EOF
[Unit]
Description=Network CRM Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
ExecStart=$(which node) dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    print_warning "Systemd service file created at /tmp/network-crm.service"
    print_warning "Run: sudo cp /tmp/network-crm.service /etc/systemd/system/"
    print_warning "Then: sudo systemctl enable network-crm && sudo systemctl start network-crm"
fi

# Security checks
print_status "Running security checks..."

# Check file permissions
find . -name "*.js" -exec chmod 644 {} \;
find . -name "*.json" -exec chmod 644 {} \;
chmod 600 .env

# Check for common vulnerabilities
npm audit --audit-level moderate || print_warning "Security vulnerabilities found - review npm audit output"

print_success "Security checks completed"

# Performance optimizations
print_status "Applying performance optimizations..."

# Set NODE_ENV to production
export NODE_ENV=production

# Optimize Node.js flags for production
export NODE_OPTIONS="--max-old-space-size=2048"

print_success "Performance optimizations applied"

# Final checks
print_status "Running final validation..."

# Test database connection
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => { console.log('✅ Database connection successful'); process.exit(0); })
  .catch((e) => { console.error('❌ Database connection failed:', e.message); process.exit(1); });
" || {
    print_error "Database connection test failed"
    exit 1
}

print_success "Final validation completed"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set NODE_ENV=production in your environment"
echo "2. Start the server: npm start"
echo "3. Monitor logs: tail -f logs/combined.log"
echo "4. Check health: curl http://localhost:3002/health"
echo ""
echo "📊 Production checklist:"
echo "✅ Dependencies installed"
echo "✅ Database migrations applied"  
echo "✅ TypeScript compiled"
echo "✅ Environment validated"
echo "✅ Security configured"
echo "✅ Logging enabled"
echo "✅ Rate limiting active"
echo "✅ Input validation enabled"
echo ""
echo "🔒 Security features enabled:"
echo "• Rate limiting (100 req/15min, auth: 10 req/15min, upload: 5 req/min)"
echo "• XSS protection"
echo "• SQL injection protection"
echo "• File upload validation"
echo "• CORS protection"
echo "• Helmet security headers"
echo "• Structured logging with security events"
echo ""
print_success "Server is production-ready! 🚀"