#!/bin/bash

# Seed Script for Salomon Product Data
# This script runs the TypeScript seed script to populate the DynamoDB table
# with initial Salomon trail running shoes data.

set -e

# Default values
REGION="${AWS_REGION:-us-east-1}"
TABLE_NAME="${TABLE_NAME:-PriceComparisonTable}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --table-name)
            TABLE_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --region REGION          AWS region (default: us-east-1)"
            echo "  --table-name TABLE_NAME  DynamoDB table name (default: PriceComparisonTable)"
            echo "  --help                   Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "=== Salomon Product Data Seed Script ==="
echo ""

# Check if AWS CLI is configured
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: AWS credentials not configured"
    echo "Please run 'aws configure' to set up your credentials"
    exit 1
fi
echo "✓ AWS credentials found"

# Check if table exists
echo "Checking if DynamoDB table exists..."
if ! aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" &> /dev/null; then
    echo "Error: Table '$TABLE_NAME' not found in region '$REGION'"
    echo "Please deploy the CDK stack first: npm run deploy"
    exit 1
fi
echo "✓ Table '$TABLE_NAME' found"

# Set environment variables
export AWS_REGION="$REGION"
export TABLE_NAME="$TABLE_NAME"

echo ""
echo "Running seed script..."
echo "Region: $REGION"
echo "Table: $TABLE_NAME"
echo ""

# Run the TypeScript seed script
npm run seed:products

echo ""
echo "=== Seed completed successfully! ==="
echo ""
echo "Next steps:"
echo "1. Verify products in DynamoDB console"
echo "2. Run price update function to fetch prices"
echo "3. Test the frontend application"
