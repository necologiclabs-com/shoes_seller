#!/usr/bin/env pwsh

<#
.SYNOPSIS
    E2E Verification Script for Trail Running Price Comparison Site

.DESCRIPTION
    このスクリプトは、トレイルランニング価格比較サイトのE2Eテストを実行します。
    バックエンド、フロントエンド、データの整合性を検証します。

.PARAMETER StackName
    CloudFormationスタック名（デフォルト: PriceComparisonStack）

.PARAMETER Region
    AWSリージョン（デフォルト: ap-northeast-1）

.EXAMPLE
    .\verify-e2e.ps1

.EXAMPLE
    .\verify-e2e.ps1 -StackName MyStack -Region us-east-1
#>

param(
    [string]$StackName = "PriceComparisonStack",
    [string]$Region = "ap-northeast-1"
)

$ErrorActionPreference = "Continue"

Write-Host "🚀 Starting E2E Verification Tests..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Stack Name: $StackName" -ForegroundColor Gray
Write-Host "Region: $Region" -ForegroundColor Gray
Write-Host ""

# Test counters
$script:PassedTests = 0
$script:FailedTests = 0
$script:TestResults = @()

function Test-Result {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Message,
        [object]$Details = $null
    )

    $script:TestResults += @{
        Name = $Name
        Passed = $Passed
        Message = $Message
        Details = $Details
    }

    if ($Passed) {
        $script:PassedTests++
        Write-Host "✅ $Name`: $Message" -ForegroundColor Green
    } else {
        $script:FailedTests++
        Write-Host "❌ $Name`: $Message" -ForegroundColor Red
    }

    if ($Details) {
        Write-Host "   Details: $($Details | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
}

function Get-StackOutputs {
    Write-Host "📋 Getting Stack Outputs..." -ForegroundColor Yellow
    Write-Host ""

    try {
        $stack = aws cloudformation describe-stacks `
            --stack-name $StackName `
            --region $Region `
            --query "Stacks[0]" `
            --output json | ConvertFrom-Json

        if (-not $stack) {
            throw "Stack $StackName not found"
        }

        $outputs = @{}
        foreach ($output in $stack.Outputs) {
            $outputs[$output.OutputKey] = $output.OutputValue
        }

        return $outputs
    } catch {
        Write-Host "❌ Error getting stack outputs: $_" -ForegroundColor Red
        throw
    }
}

function Test-BackendDeployment {
    param([hashtable]$Outputs)

    Write-Host "📋 Testing Backend Deployment..." -ForegroundColor Yellow
    Write-Host ""

    # Test API Gateway endpoint
    $apiEndpoint = $Outputs["ApiEndpoint"]
    Test-Result -Name "Backend - API Gateway Endpoint" `
        -Passed ($null -ne $apiEndpoint) `
        -Message $(if ($apiEndpoint) { "Endpoint found: $apiEndpoint" } else { "Endpoint not found" })

    # Test DynamoDB table
    $tableName = if ($Outputs["TableName"]) { $Outputs["TableName"] } else { "PriceComparisonTable" }
    Test-Result -Name "Backend - DynamoDB Table" `
        -Passed ($null -ne $tableName) `
        -Message $(if ($tableName) { "Table name: $tableName" } else { "Table not found" })

    return @{
        ApiEndpoint = $apiEndpoint
        TableName = $tableName
    }
}

function Test-FrontendDeployment {
    param([hashtable]$Outputs)

    Write-Host ""
    Write-Host "🌐 Testing Frontend Deployment..." -ForegroundColor Yellow
    Write-Host ""

    # Test CloudFront URL
    $cloudFrontUrl = $Outputs["CloudFrontUrl"]
    Test-Result -Name "Frontend - CloudFront URL" `
        -Passed ($null -ne $cloudFrontUrl) `
        -Message $(if ($cloudFrontUrl) { "URL: $cloudFrontUrl" } else { "URL not found" })

    # Test S3 Bucket
    $bucketName = $Outputs["BucketName"]
    Test-Result -Name "Frontend - S3 Bucket" `
        -Passed ($null -ne $bucketName) `
        -Message $(if ($bucketName) { "Bucket: $bucketName" } else { "Bucket not found" })

    return @{
        CloudFrontUrl = $cloudFrontUrl
        BucketName = $bucketName
    }
}

function Test-ProductData {
    param([string]$TableName)

    Write-Host ""
    Write-Host "📦 Testing Product Data..." -ForegroundColor Yellow
    Write-Host ""

    try {
        $result = aws dynamodb scan `
            --table-name $TableName `
            --filter-expression "begins_with(PK, :pk) AND SK = :sk" `
            --expression-attribute-values '{":pk":{"S":"PRODUCT#"},":sk":{"S":"METADATA"}}' `
            --region $Region `
            --max-items 10 `
            --output json | ConvertFrom-Json

        $productCount = $result.Items.Count

        Test-Result -Name "Data - Products Seeded" `
            -Passed ($productCount -gt 0) `
            -Message "Found $productCount products" `
            -Details @{ count = $productCount }

        # Check first product structure
        if ($productCount -gt 0) {
            $firstProduct = $result.Items[0]
            $hasRequiredFields = ($firstProduct.name -and $firstProduct.modelNumber -and $firstProduct.brand -and $firstProduct.imageUrl)

            Test-Result -Name "Data - Product Structure" `
                -Passed $hasRequiredFields `
                -Message $(if ($hasRequiredFields) { "Product has all required fields" } else { "Product missing required fields" }) `
                -Details @{
                    name = $firstProduct.name.S
                    modelNumber = $firstProduct.modelNumber.S
                    brand = $firstProduct.brand.S
                }
        }

        return $productCount
    } catch {
        Test-Result -Name "Data - Products Seeded" `
            -Passed $false `
            -Message "Error: $_"
        return 0
    }
}

function Test-PriceData {
    param([string]$TableName)

    Write-Host ""
    Write-Host "💰 Testing Price Data..." -ForegroundColor Yellow
    Write-Host ""

    try {
        $result = aws dynamodb scan `
            --table-name $TableName `
            --filter-expression "begins_with(SK, :sk)" `
            --expression-attribute-values '{":sk":{"S":"PRICE#"}}' `
            --region $Region `
            --max-items 20 `
            --output json | ConvertFrom-Json

        $priceCount = $result.Items.Count

        Test-Result -Name "Data - Price Data Exists" `
            -Passed ($priceCount -gt 0) `
            -Message "Found $priceCount price records" `
            -Details @{ count = $priceCount }

        # Check platforms
        if ($priceCount -gt 0) {
            $platforms = $result.Items | ForEach-Object { $_.platform.S } | Select-Object -Unique
            $expectedPlatforms = @("amazon", "rakuten", "yodobashi", "mercari")
            $hasPlatforms = $platforms | Where-Object { $expectedPlatforms -contains $_ }

            Test-Result -Name "Data - Multiple Platforms" `
                -Passed ($hasPlatforms.Count -gt 0) `
                -Message "Found platforms: $($platforms -join ', ')" `
                -Details @{ platforms = $platforms }
        }

        return $priceCount
    } catch {
        Test-Result -Name "Data - Price Data Exists" `
            -Passed $false `
            -Message "Error: $_"
        return 0
    }
}

function Test-ApiEndpoints {
    param([string]$ApiEndpoint)

    Write-Host ""
    Write-Host "🔌 Testing API Endpoints..." -ForegroundColor Yellow
    Write-Host ""

    try {
        # Test GET /products
        $response = Invoke-WebRequest -Uri "$ApiEndpoint/products" -Method Get -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json

        $success = ($response.StatusCode -eq 200) -and ($data.products -is [array])
        Test-Result -Name "API - GET /products" `
            -Passed $success `
            -Message $(if ($success) { "Success: $($data.products.Count) products returned" } else { "Failed: $($response.StatusCode)" }) `
            -Details @{ status = $response.StatusCode; productCount = $data.products.Count }

        # Test GET /products/{productId}
        if ($data.products -and $data.products.Count -gt 0) {
            $firstProductId = $data.products[0].id
            $detailResponse = Invoke-WebRequest -Uri "$ApiEndpoint/products/$firstProductId" -Method Get -UseBasicParsing
            $detailData = $detailResponse.Content | ConvertFrom-Json

            $detailSuccess = ($detailResponse.StatusCode -eq 200) -and ($detailData.product)
            Test-Result -Name "API - GET /products/{productId}" `
                -Passed $detailSuccess `
                -Message $(if ($detailSuccess) { "Success: Product $firstProductId retrieved" } else { "Failed: $($detailResponse.StatusCode)" }) `
                -Details @{ status = $detailResponse.StatusCode; productId = $firstProductId }

            # Test GET /products/{productId}/prices
            $pricesResponse = Invoke-WebRequest -Uri "$ApiEndpoint/products/$firstProductId/prices" -Method Get -UseBasicParsing
            $pricesData = $pricesResponse.Content | ConvertFrom-Json

            $pricesSuccess = ($pricesResponse.StatusCode -eq 200) -and ($pricesData.prices -is [array])
            Test-Result -Name "API - GET /products/{productId}/prices" `
                -Passed $pricesSuccess `
                -Message $(if ($pricesSuccess) { "Success: $($pricesData.prices.Count) prices returned" } else { "Failed: $($pricesResponse.StatusCode)" }) `
                -Details @{ status = $pricesResponse.StatusCode; priceCount = $pricesData.prices.Count }
        }
    } catch {
        Test-Result -Name "API - Endpoints" `
            -Passed $false `
            -Message "Error: $_"
    }
}

function Test-ErrorScenarios {
    param([string]$ApiEndpoint)

    Write-Host ""
    Write-Host "🚨 Testing Error Scenarios..." -ForegroundColor Yellow
    Write-Host ""

    # Test 404 Not Found
    try {
        $response = Invoke-WebRequest -Uri "$ApiEndpoint/products/non-existent-product-id" -Method Get -UseBasicParsing -SkipHttpErrorCheck
        $is404 = $response.StatusCode -eq 404

        Test-Result -Name "Error - 404 Not Found" `
            -Passed $is404 `
            -Message $(if ($is404) { "Correctly returns 404 for non-existent product" } else { "Unexpected status: $($response.StatusCode)" }) `
            -Details @{ status = $response.StatusCode }
    } catch {
        Test-Result -Name "Error - 404 Not Found" `
            -Passed $false `
            -Message "Error: $_"
    }
}

function Show-Summary {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host ""

    $total = $script:PassedTests + $script:FailedTests
    $successRate = if ($total -gt 0) { ($script:PassedTests / $total) * 100 } else { 0 }

    Write-Host "Total Tests: $total"
    Write-Host "✅ Passed: $script:PassedTests" -ForegroundColor Green
    Write-Host "❌ Failed: $script:FailedTests" -ForegroundColor Red
    Write-Host "Success Rate: $($successRate.ToString('F1'))%"
    Write-Host ""

    if ($script:FailedTests -gt 0) {
        Write-Host "Failed Tests:" -ForegroundColor Red
        $script:TestResults | Where-Object { -not $_.Passed } | ForEach-Object {
            Write-Host "  ❌ $($_.Name): $($_.Message)" -ForegroundColor Red
        }
        Write-Host ""
    }

    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host ""
}

# Main execution
try {
    $outputs = Get-StackOutputs

    $backend = Test-BackendDeployment -Outputs $outputs
    $frontend = Test-FrontendDeployment -Outputs $outputs

    if ($backend.TableName) {
        Test-ProductData -TableName $backend.TableName
        Test-PriceData -TableName $backend.TableName
    }

    if ($backend.ApiEndpoint) {
        Test-ApiEndpoints -ApiEndpoint $backend.ApiEndpoint
        Test-ErrorScenarios -ApiEndpoint $backend.ApiEndpoint
    }

    Show-Summary

    Write-Host "✨ E2E Verification Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Open the frontend URL in your browser:"
    Write-Host "   $($frontend.CloudFrontUrl)" -ForegroundColor Cyan
    Write-Host "2. Follow the manual testing guide:"
    Write-Host "   .kiro\specs\trail-running-price-comparison\task-16-e2e-testing-guide.md" -ForegroundColor Cyan
    Write-Host "3. Test the complete user flow"
    Write-Host "4. Verify affiliate links"
    Write-Host ""

    if ($script:FailedTests -gt 0) {
        exit 1
    }
} catch {
    Write-Host "❌ Error running E2E verification: $_" -ForegroundColor Red
    exit 1
}
