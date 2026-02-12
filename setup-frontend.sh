#!/bin/bash

# Expense Tracker - Frontend Setup Script

echo "🚀 Setting up Expense Tracker Frontend..."
echo ""

# Check Node version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Error: Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check pnpm
echo "📦 Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Installing..."
    npm install -g pnpm
fi
echo "✅ pnpm version: $(pnpm -v)"

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
pnpm install

# Generate API client (if backend is running)
echo ""
echo "🔄 Attempting to generate API client..."
if curl -s http://localhost:3001/documentation/json > /dev/null 2>&1; then
    echo "✅ Backend is running. Generating API client..."
    cd packages/api-client
    pnpm generate
    cd ../..
else
    echo "⚠️  Backend not running. Skipping API client generation."
    echo "   Start backend first, then run: cd packages/api-client && pnpm generate"
fi

# Summary
echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start the backend API (if not already running):"
echo "      pnpm dev"
echo ""
echo "   2. Start the frontend dev server:"
echo "      pnpm dev:web"
echo ""
echo "   3. Open http://localhost:3000 in your browser"
echo ""
echo "💡 Tip: Check SETUP_FRONTEND.md for detailed instructions"
echo ""
