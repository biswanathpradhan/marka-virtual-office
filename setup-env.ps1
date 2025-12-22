# Virtual Office - Environment Setup Script
# This script helps you set up your .env file

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Virtual Office - Environment Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path .env) {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Setup cancelled. Your existing .env file is unchanged." -ForegroundColor Yellow
        exit
    }
}

# Copy template
if (Test-Path env.template) {
    Copy-Item env.template .env -Force
    Write-Host "✅ Created .env file from template" -ForegroundColor Green
} else {
    Write-Host "❌ env.template file not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Please update the following values in .env:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. DB_PASSWORD - Your MySQL password" -ForegroundColor White
Write-Host "  2. JWT_SECRET - Generate with: node -e `"console.log(require('crypto').randomBytes(32).toString('hex'))`"" -ForegroundColor White
Write-Host "  3. CLIENT_URL - Your frontend URL (for production)" -ForegroundColor White
Write-Host ""
Write-Host "All other variables are pre-configured with defaults." -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Edit .env file and update the values above" -ForegroundColor White
Write-Host "  2. Run: npm run migrate" -ForegroundColor White
Write-Host "  3. Run: npm run dev" -ForegroundColor White
Write-Host ""

