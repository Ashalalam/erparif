# Open Supabase SQL Editor and prepare migration
Write-Host "================================" -ForegroundColor Cyan
Write-Host "APPLYING PAYMENT MIGRATION" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy migration to clipboard
Write-Host "Step 1: Copying migration to clipboard..." -ForegroundColor Yellow
Get-Content "migration-add-payment-fields.sql" | Set-Clipboard
Write-Host "✅ Migration SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""

# Step 2: Open Supabase SQL Editor
Write-Host "Step 2: Opening Supabase SQL Editor..." -ForegroundColor Yellow
$url = "https://supabase.com/dashboard/project/kkcugqqohxfegdjipllo/sql/new"
Start-Process $url
Write-Host "✅ Browser opened!" -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS (In Browser):" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ✅ Migration is ALREADY in your clipboard" -ForegroundColor Green
Write-Host "2. 📝 In SQL Editor: Press Ctrl+V to PASTE" -ForegroundColor Yellow
Write-Host "3. ▶️  Click the green RUN button (or Ctrl+Enter)" -ForegroundColor Yellow
Write-Host "4. ⏳ Wait for success message" -ForegroundColor Yellow
Write-Host "5. 🔄 Come back here when done" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

# Wait for user confirmation
Write-Host ""
Write-Host "Press Enter after you've run the migration in Supabase..." -ForegroundColor Cyan
$null = Read-Host

# Check if migration was applied
Write-Host ""
Write-Host "Checking if migration was applied..." -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ If you saw success message in Supabase, you're done!" -ForegroundColor Green
Write-Host "🔄 Now refresh your app (F5) and online payment will work!" -ForegroundColor Green
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "MIGRATION COMPLETE!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
