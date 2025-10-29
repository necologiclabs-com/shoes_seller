#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Seeds initial Salomon product data into DynamoDB

.DESCRIPTION
    This script runs the TypeScript seed script to populate the DynamoDB table
    with initial Salomon trail running shoes data.

.PARAMETER Region
    AWS region where the DynamoDB table is deployed (default: us-east-1)

.PARAMETER TableName
    DynamoDB table name (default: PriceComparisonTable)

.EXAMPLE
    .\seed-products.ps1
    
.EXAMPLE
    .\seed-products.ps1 -Region us-west-2 -TableName MyTable
#>

param(
    [string]$Region = "us-east-1",
    [string]$TableName = "PriceComparisonTable"
)

Write-Host "=== Salomon Product Data Seed Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is configured
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
try {
    $awsIdentity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: AWS credentials not configured" -ForegroundColor Red
        Write-Host "Please run 'aws configure' to set up your credentials" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ AWS credentials found" -ForegroundColor Green
} catch {
    Write-Host "Error: AWS CLI not found or not configured" -ForegroundColor Red
    exit 1
}

# Check if table exists
Write-Host "Checking if DynamoDB table exists..." -ForegroundColor Yellow
try {
    $tableCheck = aws dynamodb describe-table --table-name $TableName --region $Region 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Table '$TableName' not found in region '$Region'" -ForegroundColor Red
        Write-Host "Please deploy the CDK stack first: npm run deploy" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Table '$TableName' found" -ForegroundColor Green
} catch {
    Write-Host "Error: Failed to check table existence" -ForegroundColor Red
    exit 1
}

# Set environment variables
$env:AWS_REGION = $Region
$env:TABLE_NAME = $TableName

Write-Host ""
Write-Host "Running seed script..." -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "Table: $TableName" -ForegroundColor Cyan
Write-Host ""

# Run the TypeScript seed script
npm run seed:products

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Seed completed successfully! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Verify products in DynamoDB console" -ForegroundColor White
    Write-Host "2. Run price update function to fetch prices" -ForegroundColor White
    Write-Host "3. Test the frontend application" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "=== Seed failed ===" -ForegroundColor Red
    exit 1
}
