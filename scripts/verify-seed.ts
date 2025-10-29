#!/usr/bin/env node

/**
 * Verification Script for Seeded Product Data
 * 
 * This script verifies that products were successfully seeded into DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'PriceComparisonTable';

interface ProductItem {
    PK: string;
    SK: string;
    entityType: string;
    name: string;
    modelNumber: string;
    brand: string;
    category: string;
    createdAt: string;
    updatedAt: string;
}

async function verifyProducts(): Promise<void> {
    console.log('Verifying seeded products...');
    console.log(`Table: ${TABLE_NAME}`);
    console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}\n`);

    try {
        // Scan for all product entities
        const result = await docClient.send(
            new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'entityType = :type',
                ExpressionAttributeValues: {
                    ':type': 'product',
                },
            })
        );

        const products = result.Items as ProductItem[];

        if (!products || products.length === 0) {
            console.log('⚠ No products found in the database');
            console.log('\nPlease run the seed script first:');
            console.log('  npm run seed:products');
            process.exit(1);
        }

        console.log(`✓ Found ${products.length} products\n`);
        console.log('=== Product List ===\n');

        // Sort by name for consistent display
        products.sort((a, b) => a.name.localeCompare(b.name));

        products.forEach((product, index) => {
            const productId = product.PK.replace('PRODUCT#', '');
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   ID: ${productId}`);
            console.log(`   Model: ${product.modelNumber}`);
            console.log(`   Brand: ${product.brand}`);
            console.log(`   Category: ${product.category}`);
            console.log(`   Created: ${product.createdAt}`);
            console.log('');
        });

        // Verify expected count
        const expectedCount = 10;
        if (products.length === expectedCount) {
            console.log(`✓ All ${expectedCount} expected products are present`);
        } else {
            console.log(`⚠ Expected ${expectedCount} products, but found ${products.length}`);
        }

        // Check for Salomon brand
        const salomonProducts = products.filter(p => p.brand === 'Salomon');
        console.log(`✓ ${salomonProducts.length} Salomon products found`);

        // Check for trail-running category
        const trailRunningProducts = products.filter(p => p.category === 'trail-running');
        console.log(`✓ ${trailRunningProducts.length} trail-running products found`);

        console.log('\n=== Verification Summary ===');
        console.log(`Total products: ${products.length}`);
        console.log(`Salomon products: ${salomonProducts.length}`);
        console.log(`Trail running products: ${trailRunningProducts.length}`);
        console.log('\n✓ Verification completed successfully!');

    } catch (error: any) {
        console.error('\n✗ Verification failed:', error.message);

        if (error.name === 'ResourceNotFoundException') {
            console.error('\nThe DynamoDB table does not exist.');
            console.error('Please deploy the CDK stack first: npm run deploy');
        } else if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidClientTokenId') {
            console.error('\nAWS credentials are not configured or invalid.');
            console.error('Please run: aws configure');
        } else {
            console.error('\nError details:', error);
        }

        process.exit(1);
    }
}

// Run verification
verifyProducts()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
