#!/usr/bin/env pwsh

Write-Host "🏃 HOKA ONE ONE Product Seeding Script" -ForegroundColor Cyan
Write-Host ""

# Check if AWS_PROFILE is set
if (-not $env:AWS_PROFILE) {
    Write-Host "⚠️  AWS_PROFILE not set. Setting to 'hikaku-dev'..." -ForegroundColor Yellow
    $env:AWS_PROFILE = "hikaku-dev"
}

Write-Host "🔑 AWS Profile: $env:AWS_PROFILE" -ForegroundColor Green
Write-Host ""

# Get table name from CloudFormation stack
Write-Host "📊 Fetching DynamoDB table name..." -ForegroundColor Cyan
try {
    $stackOutputs = aws cloudformation describe-stacks `
        --stack-name PriceComparisonStack `
        --query "Stacks[0].Outputs" `
        --output json | ConvertFrom-Json

    $tableName = ($stackOutputs | Where-Object { $_.OutputKey -eq "TableName" }).OutputValue
    
    if ($tableName) {
        Write-Host "✅ Table: $tableName" -ForegroundColor Green
        $env:TABLE_NAME = $tableName
    } else {
        Write-Host "❌ Could not find TableName in stack outputs" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to fetch stack outputs: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Running seed script..." -ForegroundColor Cyan
Write-Host ""

# Run the TypeScript seed script
npx ts-node scripts/seed-hoka-products.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ HOKA products seeded successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Seeding failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
