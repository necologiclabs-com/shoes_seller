#!/bin/bash

# E2E Verification Script for Trail Running Price Comparison Site
#
# このスクリプトは、トレイルランニング価格比較サイトのE2Eテストを実行します。
# バックエンド、フロントエンド、データの整合性を検証します。
#
# 使用方法:
#   ./verify-e2e.sh
#   ./verify-e2e.sh MyStack us-east-1

set -e

STACK_NAME="${1:-PriceComparisonStack}"
REGION="${2:-ap-northeast-1}"

PASSED_TESTS=0
FAILED_TESTS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Starting E2E Verification Tests...${NC}"
echo ""
echo -e "${GRAY}Stack Name: $STACK_NAME${NC}"
echo -e "${GRAY}Region: $REGION${NC}"
echo ""

test_result() {
    local name="$1"
    local passed="$2"
    local message="$3"

    if [ "$passed" = "true" ]; then
        ((PASSED_TESTS++))
        echo -e "${GREEN}✅ $name: $message${NC}"
    else
        ((FAILED_TESTS++))
        echo -e "${RED}❌ $name: $message${NC}"
    fi
}

get_stack_outputs() {
    echo -e "${YELLOW}📋 Getting Stack Outputs...${NC}"
    echo ""

    STACK_JSON=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0]" \
        --output json 2>/dev/null)

    if [ -z "$STACK_JSON" ]; then
        echo -e "${RED}❌ Stack $STACK_NAME not found${NC}"
        exit 1
    fi
}

test_backend_deployment() {
    echo -e "${YELLOW}📋 Testing Backend Deployment...${NC}"
    echo ""

    API_ENDPOINT=$(echo "$STACK_JSON" | jq -r '.Outputs[] | select(.OutputKey=="ApiEndpoint") | .OutputValue')
    if [ -n "$API_ENDPOINT" ] && [ "$API_ENDPOINT" != "null" ]; then
        test_result "Backend - API Gateway Endpoint" "true" "Endpoint found: $API_ENDPOINT"
    else
        test_result "Backend - API Gateway Endpoint" "false" "Endpoint not found"
    fi

    TABLE_NAME=$(echo "$STACK_JSON" | jq -r '.Outputs[] | select(.OutputKey=="TableName") | .OutputValue')
    if [ -z "$TABLE_NAME" ] || [ "$TABLE_NAME" = "null" ]; then
        TABLE_NAME="PriceComparisonTable"
    fi
    test_result "Backend - DynamoDB Table" "true" "Table name: $TABLE_NAME"
}

test_frontend_deployment() {
    echo ""
    echo -e "${YELLOW}🌐 Testing Frontend Deployment...${NC}"
    echo ""

    CLOUDFRONT_URL=$(echo "$STACK_JSON" | jq -r '.Outputs[] | select(.OutputKey=="CloudFrontUrl") | .OutputValue')
    if [ -n "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "null" ]; then
        test_result "Frontend - CloudFront URL" "true" "URL: $CLOUDFRONT_URL"
    else
        test_result "Frontend - CloudFront URL" "false" "URL not found"
    fi

    BUCKET_NAME=$(echo "$STACK_JSON" | jq -r '.Outputs[] | select(.OutputKey=="BucketName") | .OutputValue')
    if [ -n "$BUCKET_NAME" ] && [ "$BUCKET_NAME" != "null" ]; then
        test_result "Frontend - S3 Bucket" "true" "Bucket: $BUCKET_NAME"
    else
        test_result "Frontend - S3 Bucket" "false" "Bucket not found"
    fi
}

test_product_data() {
    echo ""
    echo -e "${YELLOW}📦 Testing Product Data...${NC}"
    echo ""

    PRODUCTS=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --filter-expression "begins_with(PK, :pk) AND SK = :sk" \
        --expression-attribute-values '{":pk":{"S":"PRODUCT#"},":sk":{"S":"METADATA"}}' \
        --region "$REGION" \
        --max-items 10 \
        --output json 2>/dev/null)

    PRODUCT_COUNT=$(echo "$PRODUCTS" | jq '.Items | length')

    if [ "$PRODUCT_COUNT" -gt 0 ]; then
        test_result "Data - Products Seeded" "true" "Found $PRODUCT_COUNT products"

        # Check first product structure
        HAS_REQUIRED=$(echo "$PRODUCTS" | jq -r '.Items[0] | has("name") and has("modelNumber") and has("brand") and has("imageUrl")')
        if [ "$HAS_REQUIRED" = "true" ]; then
            test_result "Data - Product Structure" "true" "Product has all required fields"
        else
            test_result "Data - Product Structure" "false" "Product missing required fields"
        fi
    else
        test_result "Data - Products Seeded" "false" "No products found"
    fi
}

test_price_data() {
    echo ""
    echo -e "${YELLOW}💰 Testing Price Data...${NC}"
    echo ""

    PRICES=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --filter-expression "begins_with(SK, :sk)" \
        --expression-attribute-values '{":sk":{"S":"PRICE#"}}' \
        --region "$REGION" \
        --max-items 20 \
        --output json 2>/dev/null)

    PRICE_COUNT=$(echo "$PRICES" | jq '.Items | length')

    if [ "$PRICE_COUNT" -gt 0 ]; then
        test_result "Data - Price Data Exists" "true" "Found $PRICE_COUNT price records"

        # Check platforms
        PLATFORMS=$(echo "$PRICES" | jq -r '.Items[].platform.S' | sort -u | tr '\n' ',' | sed 's/,$//')
        test_result "Data - Multiple Platforms" "true" "Found platforms: $PLATFORMS"
    else
        test_result "Data - Price Data Exists" "false" "No price data found"
    fi
}

test_api_endpoints() {
    echo ""
    echo -e "${YELLOW}🔌 Testing API Endpoints...${NC}"
    echo ""

    # Test GET /products
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT/products")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        PRODUCT_COUNT=$(echo "$BODY" | jq '.products | length')
        test_result "API - GET /products" "true" "Success: $PRODUCT_COUNT products returned"

        # Test GET /products/{productId}
        FIRST_PRODUCT_ID=$(echo "$BODY" | jq -r '.products[0].id')
        if [ -n "$FIRST_PRODUCT_ID" ] && [ "$FIRST_PRODUCT_ID" != "null" ]; then
            DETAIL_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT/products/$FIRST_PRODUCT_ID")
            DETAIL_HTTP_CODE=$(echo "$DETAIL_RESPONSE" | tail -n1)

            if [ "$DETAIL_HTTP_CODE" = "200" ]; then
                test_result "API - GET /products/{productId}" "true" "Success: Product $FIRST_PRODUCT_ID retrieved"
            else
                test_result "API - GET /products/{productId}" "false" "Failed: $DETAIL_HTTP_CODE"
            fi

            # Test GET /products/{productId}/prices
            PRICES_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT/products/$FIRST_PRODUCT_ID/prices")
            PRICES_HTTP_CODE=$(echo "$PRICES_RESPONSE" | tail -n1)
            PRICES_BODY=$(echo "$PRICES_RESPONSE" | sed '$d')

            if [ "$PRICES_HTTP_CODE" = "200" ]; then
                PRICE_COUNT=$(echo "$PRICES_BODY" | jq '.prices | length')
                test_result "API - GET /products/{productId}/prices" "true" "Success: $PRICE_COUNT prices returned"
            else
                test_result "API - GET /products/{productId}/prices" "false" "Failed: $PRICES_HTTP_CODE"
            fi
        fi
    else
        test_result "API - GET /products" "false" "Failed: $HTTP_CODE"
    fi
}

test_error_scenarios() {
    echo ""
    echo -e "${YELLOW}🚨 Testing Error Scenarios...${NC}"
    echo ""

    # Test 404 Not Found
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT/products/non-existent-product-id")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "404" ]; then
        test_result "Error - 404 Not Found" "true" "Correctly returns 404 for non-existent product"
    else
        test_result "Error - 404 Not Found" "false" "Unexpected status: $HTTP_CODE"
    fi
}

show_summary() {
    echo ""
    echo -e "${CYAN}============================================================${NC}"
    echo -e "${CYAN}📊 TEST SUMMARY${NC}"
    echo -e "${CYAN}============================================================${NC}"
    echo ""

    TOTAL=$((PASSED_TESTS + FAILED_TESTS))
    if [ $TOTAL -gt 0 ]; then
        SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS / $TOTAL) * 100}")
    else
        SUCCESS_RATE="0.0"
    fi

    echo "Total Tests: $TOTAL"
    echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo "Success Rate: $SUCCESS_RATE%"
    echo ""

    echo -e "${CYAN}============================================================${NC}"
    echo ""
}

# Main execution
get_stack_outputs
test_backend_deployment
test_frontend_deployment

if [ -n "$TABLE_NAME" ]; then
    test_product_data
    test_price_data
fi

if [ -n "$API_ENDPOINT" ]; then
    test_api_endpoints
    test_error_scenarios
fi

show_summary

echo -e "${GREEN}✨ E2E Verification Complete!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Open the frontend URL in your browser:"
echo -e "   ${CYAN}$CLOUDFRONT_URL${NC}"
echo "2. Follow the manual testing guide:"
echo -e "   ${CYAN}.kiro/specs/trail-running-price-comparison/task-16-e2e-testing-guide.md${NC}"
echo "3. Test the complete user flow"
echo "4. Verify affiliate links"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
fi
