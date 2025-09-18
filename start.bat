@echo off
REM Next.js Warehouse KPI Dashboard Startup Script for Windows

echo 🚀 Starting Next.js Warehouse KPI Dashboard...

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

echo 📊 Dashboard will be available at: http://localhost:3000
echo 📁 Upload CSV files to analyze barcode data
echo 🔄 Press Ctrl+C to stop the server
echo --------------------------------------------------

REM Start the development server
npm run dev
