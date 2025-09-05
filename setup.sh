#!/bin/bash

echo "🚀 Setting up Network CRM System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js is installed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
echo "✅ Server dependencies installed"

# Install client dependencies
echo "📦 Installing client dependencies..."
cd ../client
npm install
echo "✅ Client dependencies installed"

cd ..

# Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo "⚠️  Please update server/.env with your database URL and API keys"
else
    echo "✅ server/.env already exists"
fi

# Generate Prisma client
echo "🗄️ Setting up database..."
cd server
npx prisma generate

# Check if we can connect to database
echo "🔍 Testing database connection..."
if npx prisma db push; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your DATABASE_URL in server/.env"
    exit 1
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update server/.env with your API keys (OpenAI, email settings)"
echo "2. Run 'npm run dev' to start both server and client"
echo "3. Visit http://localhost:3000 to access the application"
echo ""
echo "To import your existing contact data:"
echo "1. Register/login to create an account"
echo "2. Go to Import page and use the preset import options"
echo ""