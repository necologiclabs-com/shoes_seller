#!/usr/bin/env node

/**
 * E2E Verification Script
 * 
 * このスクリプトは、トレイルランニング価格比較サイトのE2Eテストを自動化します。
 * 
 * 使用方法:
 *   npm run verify:e2e
 * 
 * または:
 *   ts-node scripts/verify-e2e.ts
 */

import {
    CloudFormationClient,
    DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import {
    DynamoDBClient,
    QueryCommand,
    ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const region = process.env.AWS_REGION || 'ap-northeast-1';
const stackName = process.env.STACK_NAME || 'PriceComparisonStack';

const cfnClient = new CloudFormationClient({ region });
const dynamoClient = new DynamoDBClient({ region });
const lambdaClient = new LambdaClient({ region });

interface TestResult {
    name: string;
    passed: boolean;
    message: string;
    details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, details?: any) {
    results.push({ name, passed, message, details });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}: ${message}`);
    if (details) {
        console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
}

async function getStackOutputs() {
    try {
        const command = new DescribeStacksCommand({ StackName: stackName });
        const response = await cfnClient.send(command);
        const stack = response.Stacks?.[0];

        if (!stack) {
            throw new Error(`Stack ${stackName} not found`);
        }

        const outputs: Record<string, string> = {};
        stack.Outputs?.forEach((output) => {
            if (output.OutputKey && output.OutputValue) {
                outputs[output.OutputKey] = output.OutputValue;
            }
        });

        return outputs;
    } catch (error) {
        console.error('Error getting stack outputs:', error);
        throw error;
    }
}

async function testBackendDeployment(outputs: Record<string, string>) {
    console.log('\n📋 Testing Backend Deployment...\n');

    // Test 1: API Gateway endpoint exists
    const apiEndpoint = outputs['ApiEndpoint'];
    logTest(
        'Backend - API Gateway Endpoint',
        !!apiEndpoint,
        apiEndpoint ? `Endpoint found: ${apiEndpoint}` : 'Endpoint not found'
    );

    // Test 2: DynamoDB table exists
    const tableName = outputs['TableName'] || 'PriceComparisonTable';
    logTest(
        'Backend - DynamoDB Table',
        !!tableName,
        tableName ? `Table name: ${tableName}` : 'Table not found'
    );

    return { apiEndpoint, tableName };
}

async function testFrontendDeployment(outputs: Record<string, string>) {
    console.log('\n🌐 Testing Frontend Deployment...\n');

    // Test 1: CloudFront URL exists
    const cloudFrontUrl = outputs['CloudFrontUrl'];
    logTest(
        'Frontend - CloudFront URL',
        !!cloudFrontUrl,
        cloudFrontUrl ? `URL: ${cloudFrontUrl}` : 'URL not found'
    );

    // Test 2: S3 Bucket exists
    const bucketName = outputs['BucketName'];
    logTest(
        'Frontend - S3 Bucket',
        !!bucketName,
        bucketName ? `Bucket: ${bucketName}` : 'Bucket not found'
    );

    return { cloudFrontUrl, bucketName };
}

async function testProductData(tableName: string) {
    console.log('\n📦 Testing Product Data...\n');

    try {
        // Scan for products
        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
            ExpressionAttributeValues: {
                ':pk': { S: 'PRODUCT#' },
                ':sk': { S: 'METADATA' },
            },
            Limit: 10,
        });

        const response = await dynamoClient.send(scanCommand);
        const productCount = response.Items?.length || 0;

        logTest(
            'Data - Products Seeded',
            productCount > 0,
            `Found ${productCount} products`,
            { count: productCount }
        );

        // Check first product structure
        if (response.Items && response.Items.length > 0) {
            const firstProduct = response.Items[0];
            const hasRequiredFields =
                firstProduct.name &&
                firstProduct.modelNumber &&
                firstProduct.brand &&
                firstProduct.imageUrl;

            logTest(
                'Data - Product Structure',
                !!hasRequiredFields,
                hasRequiredFields
                    ? 'Product has all required fields'
                    : 'Product missing required fields',
                {
                    name: firstProduct.name?.S,
                    modelNumber: firstProduct.modelNumber?.S,
                    brand: firstProduct.brand?.S,
                }
            );
        }

        return productCount;
    } catch (error) {
        logTest('Data - Products Seeded', false, `Error: ${error}`);
        return 0;
    }
}

async function testPriceData(tableName: string) {
    console.log('\n💰 Testing Price Data...\n');

    try {
        // Scan for price data
        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: 'begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':sk': { S: 'PRICE#' },
            },
            Limit: 20,
        });

        const response = await dynamoClient.send(scanCommand);
        const priceCount = response.Items?.length || 0;

        logTest(
            'Data - Price Data Exists',
            priceCount > 0,
            `Found ${priceCount} price records`,
            { count: priceCount }
        );

        // Check platforms
        if (response.Items && response.Items.length > 0) {
            const platforms = new Set(
                response.Items.map((item) => item.platform?.S).filter(Boolean)
            );

            const expectedPlatforms = ['amazon', 'rakuten', 'yodobashi', 'mercari'];
            const hasPlatforms = expectedPlatforms.some((p) => platforms.has(p));

            logTest(
                'Data - Multiple Platforms',
                hasPlatforms,
                `Found platforms: ${Array.from(platforms).join(', ')}`,
                { platforms: Array.from(platforms) }
            );
        }

        return priceCount;
    } catch (error) {
        logTest('Data - Price Data Exists', false, `Error: ${error}`);
        return 0;
    }
}

async function testApiEndpoints(apiEndpoint: string) {
    console.log('\n🔌 Testing API Endpoints...\n');

    // Test 1: GET /products
    try {
        const response = await fetch(`${apiEndpoint}/products`);
        const data = await response.json();

        logTest(
            'API - GET /products',
            response.ok && Array.isArray(data.products),
            response.ok
                ? `Success: ${data.products?.length || 0} products returned`
                : `Failed: ${response.status}`,
            { status: response.status, productCount: data.products?.length }
        );

        // Test 2: GET /products/{productId}
        if (data.products && data.products.length > 0) {
            const firstProductId = data.products[0].id;
            const detailResponse = await fetch(
                `${apiEndpoint}/products/${firstProductId}`
            );
            const detailData = await detailResponse.json();

            logTest(
                'API - GET /products/{productId}',
                detailResponse.ok && detailData.product,
                detailResponse.ok
                    ? `Success: Product ${firstProductId} retrieved`
                    : `Failed: ${detailResponse.status}`,
                { status: detailResponse.status, productId: firstProductId }
            );

            // Test 3: GET /products/{productId}/prices
            const pricesResponse = await fetch(
                `${apiEndpoint}/products/${firstProductId}/prices`
            );
            const pricesData = await pricesResponse.json();

            logTest(
                'API - GET /products/{productId}/prices',
                pricesResponse.ok && Array.isArray(pricesData.prices),
                pricesResponse.ok
                    ? `Success: ${pricesData.prices?.length || 0} prices returned`
                    : `Failed: ${pricesResponse.status}`,
                {
                    status: pricesResponse.status,
                    priceCount: pricesData.prices?.length,
                }
            );
        }
    } catch (error) {
        logTest('API - Endpoints', false, `Error: ${error}`);
    }
}

async function testUpdatePricesFunction() {
    console.log('\n⚡ Testing UpdatePricesFunction...\n');

    try {
        const functionName = `${stackName}-UpdatePricesFunction`;

        const command = new InvokeCommand({
            FunctionName: functionName,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({}),
        });

        const response = await lambdaClient.send(command);
        const payload = response.Payload
            ? JSON.parse(new TextDecoder().decode(response.Payload))
            : null;

        const success = response.StatusCode === 200 && !payload?.errorMessage;

        logTest(
            'Lambda - UpdatePricesFunction',
            success,
            success
                ? 'Function executed successfully'
                : `Failed: ${payload?.errorMessage || 'Unknown error'}`,
            { statusCode: response.StatusCode, payload }
        );
    } catch (error: any) {
        logTest(
            'Lambda - UpdatePricesFunction',
            false,
            `Error: ${error.message || error}`
        );
    }
}

async function testErrorScenarios(apiEndpoint: string) {
    console.log('\n🚨 Testing Error Scenarios...\n');

    // Test 1: Non-existent product (404)
    try {
        const response = await fetch(
            `${apiEndpoint}/products/non-existent-product-id`
        );
        const is404 = response.status === 404;

        logTest(
            'Error - 404 Not Found',
            is404,
            is404
                ? 'Correctly returns 404 for non-existent product'
                : `Unexpected status: ${response.status}`,
            { status: response.status }
        );
    } catch (error) {
        logTest('Error - 404 Not Found', false, `Error: ${error}`);
    }

    // Test 2: Invalid product ID format
    try {
        const response = await fetch(`${apiEndpoint}/products/`);
        const isError = response.status >= 400;

        logTest(
            'Error - Invalid Request',
            isError,
            isError
                ? 'Correctly handles invalid request'
                : `Unexpected success: ${response.status}`,
            { status: response.status }
        );
    } catch (error) {
        logTest('Error - Invalid Request', false, `Error: ${error}`);
    }
}

async function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60) + '\n');

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
        console.log('Failed Tests:');
        results
            .filter((r) => !r.passed)
            .forEach((r) => {
                console.log(`  ❌ ${r.name}: ${r.message}`);
            });
        console.log();
    }

    console.log('='.repeat(60) + '\n');

    // Exit with error code if any tests failed
    if (failed > 0) {
        process.exit(1);
    }
}

async function main() {
    console.log('🚀 Starting E2E Verification Tests...\n');
    console.log(`Stack Name: ${stackName}`);
    console.log(`Region: ${region}\n`);

    try {
        // Get stack outputs
        const outputs = await getStackOutputs();

        // Run tests
        const { apiEndpoint, tableName } = await testBackendDeployment(outputs);
        const { cloudFrontUrl } = await testFrontendDeployment(outputs);

        if (tableName) {
            await testProductData(tableName);
            await testPriceData(tableName);
        }

        if (apiEndpoint) {
            await testApiEndpoints(apiEndpoint);
            await testErrorScenarios(apiEndpoint);
        }

        // Test Lambda function (optional - can be slow)
        // await testUpdatePricesFunction();

        // Print summary
        await printSummary();

        console.log('✨ E2E Verification Complete!\n');
        console.log('Next Steps:');
        console.log('1. Open the frontend URL in your browser:');
        console.log(`   ${cloudFrontUrl || 'Check CloudFormation outputs'}`);
        console.log('2. Follow the manual testing guide:');
        console.log(
            '   .kiro/specs/trail-running-price-comparison/task-16-e2e-testing-guide.md'
        );
        console.log('3. Test the complete user flow');
        console.log('4. Verify affiliate links\n');
    } catch (error) {
        console.error('❌ Error running E2E verification:', error);
        process.exit(1);
    }
}

main();
