@echo off
REM Expense Tracker - Frontend Setup Script (Windows)

echo.
echo 🚀 Setting up Expense Tracker Frontend...
echo.

REM Check Node version
echo 📦 Checking Node.js version...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed
    exit /b 1
)
echo ✅ Node.js version:
node --version

REM Check pnpm
echo 📦 Checking pnpm...
pnpm --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pnpm not found. Installing...
    npm install -g pnpm
)
echo ✅ pnpm version:
pnpm --version

REM Install dependencies
echo.
echo 📥 Installing dependencies...
pnpm install

REM Generate API client (if backend is running)
echo.
echo 🔄 Attempting to generate API client...
curl -s http://localhost:3001/documentation/json > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is running. Generating API client...
    cd packages\api-client
    pnpm generate
    cd ..\..
) else (
    echo ⚠️  Backend not running. Skipping API client generation.
    echo    Start backend first, then run: cd packages/api-client ^&^& pnpm generate
)

REM Summary
echo.
echo ✅ Frontend setup complete!
echo.
echo 📝 Next steps:
echo    1. Start the backend API (if not already running):
echo       pnpm dev
echo.
echo    2. Start the frontend dev server:
echo       pnpm dev:web
echo.
echo    3. Open http://localhost:3000 in your browser
echo.
echo 💡 Tip: Check SETUP_FRONTEND.md for detailed instructions
echo.

pause
