@echo off
REM Deploy Next.js Warehouse KPI Dashboard to Vercel

echo 🚀 Deploying Next.js Warehouse KPI Dashboard to Vercel...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Vercel CLI. Please install manually:
        echo    npm install -g vercel
        pause
        exit /b 1
    )
)

echo ✅ Vercel CLI found

REM Deploy to Vercel
echo 📤 Deploying...
vercel --prod

if %errorlevel% equ 0 (
    echo ✅ Deployment successful!
    echo 🌐 Your app should be live now
) else (
    echo ❌ Deployment failed
    echo Check the error messages above
)

pause
