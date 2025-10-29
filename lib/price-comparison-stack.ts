import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import * as path from 'path';

export class PriceComparisonStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // DynamoDB Table with single-table design
        const table = new dynamodb.Table(this, 'PriceComparisonTable', {
            tableName: 'PriceComparisonTable',
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            pointInTimeRecovery: true,
        });

        // Global Secondary Index for querying by brand and platform
        table.addGlobalSecondaryIndex({
            indexName: 'GSI1',
            partitionKey: {
                name: 'GSI1PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'GSI1SK',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // S3 Bucket for product images
        const productImagesBucket = new s3.Bucket(this, 'ProductImagesBucket', {
            bucketName: `price-comparison-images-${this.account}`,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    maxAge: 3600,
                },
            ],
        });

        // CloudFront Origin Access Identity for secure S3 access
        const imagesCfOai = new cloudfront.OriginAccessIdentity(this, 'ProductImagesOAI', {
            comment: 'OAI for product images bucket',
        });

        // Grant CloudFront read access to images bucket
        productImagesBucket.grantRead(imagesCfOai);

        // CloudFront Distribution for product images
        const imagesCfDistribution = new cloudfront.Distribution(this, 'ProductImagesDistribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(productImagesBucket, {
                    originAccessIdentity: imagesCfOai,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
            priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
        });

        // Lambda Layer for shared dependencies
        const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/layers/shared')),
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            description: 'Shared utilities and dependencies',
        });

        // Common Lambda environment variables
        const commonEnvironment = {
            TABLE_NAME: table.tableName,
            IMAGES_BUCKET_NAME: productImagesBucket.bucketName,
            IMAGES_CLOUDFRONT_DOMAIN: imagesCfDistribution.distributionDomainName,
            NODE_OPTIONS: '--enable-source-maps',
        };

        // GetProducts Lambda Function
        const getProductsFunction = new lambda.Function(this, 'GetProductsFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/get-products')),
            environment: commonEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logRetention: logs.RetentionDays.ONE_MONTH,
            layers: [sharedLayer],
        });

        // GetProductDetail Lambda Function
        const getProductDetailFunction = new lambda.Function(this, 'GetProductDetailFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/get-product-detail')),
            environment: commonEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logRetention: logs.RetentionDays.ONE_MONTH,
            layers: [sharedLayer],
        });

        // GetPrices Lambda Function
        const getPricesFunction = new lambda.Function(this, 'GetPricesFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/get-prices')),
            environment: commonEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logRetention: logs.RetentionDays.ONE_MONTH,
            layers: [sharedLayer],
        });

        // Grant DynamoDB permissions to Lambda functions
        table.grantReadData(getProductsFunction);
        table.grantReadData(getProductDetailFunction);
        table.grantReadData(getPricesFunction);

        // Grant SSM Parameter Store read permissions to GetPrices function
        getPricesFunction.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['ssm:GetParameter', 'ssm:GetParametersByPath'],
                resources: [
                    `arn:aws:ssm:${this.region}:${this.account}:parameter/price-comparison/affiliate/*`,
                ],
            })
        );

        // UpdatePrices Lambda Function
        const updatePricesFunction = new lambda.Function(this, 'UpdatePricesFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/update-prices')),
            environment: commonEnvironment,
            timeout: cdk.Duration.minutes(15), // Longer timeout for batch processing
            memorySize: 512, // More memory for parallel processing
            logRetention: logs.RetentionDays.ONE_MONTH,
            layers: [sharedLayer],
        });

        // Grant DynamoDB read/write permissions to UpdatePrices function
        table.grantReadWriteData(updatePricesFunction);

        // Grant SSM Parameter Store read permissions to UpdatePrices function
        updatePricesFunction.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['ssm:GetParameter', 'ssm:GetParametersByPath'],
                resources: [
                    `arn:aws:ssm:${this.region}:${this.account}:parameter/price-comparison/affiliate/*`,
                ],
            })
        );

        // EventBridge Rule to trigger UpdatePrices function every 6 hours
        const updatePricesRule = new events.Rule(this, 'UpdatePricesScheduleRule', {
            ruleName: 'price-comparison-update-prices',
            description: 'Trigger price update function every 6 hours',
            schedule: events.Schedule.rate(cdk.Duration.hours(6)),
            enabled: true,
        });

        // Add UpdatePrices function as target
        updatePricesRule.addTarget(
            new targets.LambdaFunction(updatePricesFunction, {
                retryAttempts: 2,
            })
        );

        // SyncProducts Lambda Function for Salomon catalog synchronization
        const syncProductsFunction = new lambda.Function(this, 'SyncProductsFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/sync-products')),
            environment: commonEnvironment,
            timeout: cdk.Duration.minutes(15), // Web scraping can take time
            memorySize: 1024, // HTML parsing needs more memory
            logRetention: logs.RetentionDays.ONE_MONTH,
            layers: [sharedLayer],
        });

        // Grant DynamoDB read/write permissions to SyncProducts function
        table.grantReadWriteData(syncProductsFunction);

        // Grant S3 write permissions to SyncProducts function for storing product images
        productImagesBucket.grantWrite(syncProductsFunction);

        // EventBridge Rule to trigger SyncProducts function daily at 2 AM JST (5 PM UTC previous day)
        const syncProductsRule = new events.Rule(this, 'SyncProductsScheduleRule', {
            ruleName: 'price-comparison-sync-products',
            description: 'Trigger Salomon catalog synchronization daily at 2 AM JST',
            schedule: events.Schedule.cron({
                minute: '0',
                hour: '17', // 2 AM JST = 5 PM UTC previous day
                day: '*',
                month: '*',
                year: '*'
            }),
            enabled: true,
        });

        // Add SyncProducts function as target
        syncProductsRule.addTarget(
            new targets.LambdaFunction(syncProductsFunction, {
                retryAttempts: 2,
            })
        );

        // API Gateway account-level CloudWatch logging configuration
        const apiGatewayLogRole = new iam.Role(this, 'ApiGatewayCloudWatchRole', {
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AmazonAPIGatewayPushToCloudWatchLogs'
                ),
            ],
        });

        new apigateway.CfnAccount(this, 'ApiGatewayAccount', {
            cloudWatchRoleArn: apiGatewayLogRole.roleArn,
        });

        // API Gateway REST API with CORS for custom domain
        const api = new apigateway.RestApi(this, 'PriceComparisonApi', {
            restApiName: 'Price Comparison API',
            description: 'API for trail running shoes price comparison',
            deployOptions: {
                stageName: 'prod',
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                metricsEnabled: true,
            },
            defaultCorsPreflightOptions: {
                allowOrigins: [
                    'https://shop-trail-run.neco-logic.com',
                    'https://d20dyv94x2mgkq.cloudfront.net', // Keep CloudFront default domain
                    'http://localhost:5173', // For local development
                ],
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                ],
                allowCredentials: true,
            },
        });

        // API Resources and Methods
        const products = api.root.addResource('products');

        // GET /products
        products.addMethod(
            'GET',
            new apigateway.LambdaIntegration(getProductsFunction, {
                proxy: true,
            })
        );

        // GET /products/{productId}
        const productDetail = products.addResource('{productId}');
        productDetail.addMethod(
            'GET',
            new apigateway.LambdaIntegration(getProductDetailFunction, {
                proxy: true,
            })
        );

        // GET /products/{productId}/prices
        const prices = productDetail.addResource('prices');
        prices.addMethod(
            'GET',
            new apigateway.LambdaIntegration(getPricesFunction, {
                proxy: true,
            })
        );

        // S3 Bucket for Frontend Static Hosting
        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `price-comparison-frontend-${this.account}-${this.region}`,
            publicReadAccess: false, // CloudFront serves content via OAI
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: false,
        });

        // CloudFront Origin Access Identity
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(
            this,
            'FrontendOAI',
            {
                comment: 'OAI for Price Comparison Frontend',
            }
        );

        // Grant CloudFront read access to S3 bucket
        frontendBucket.grantRead(originAccessIdentity);

        // Import ACM Certificate (must be in us-east-1 for CloudFront)
        const certificate = acm.Certificate.fromCertificateArn(
            this,
            'Certificate',
            'arn:aws:acm:us-east-1:034362042455:certificate/ae70849e-6084-4ec0-8781-4fdb6fede307'
        );

        // Custom domain configuration
        const domainName = 'shop-trail-run.neco-logic.com';

        // CloudFront Distribution with custom domain
        const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(frontendBucket, {
                    originAccessIdentity: originAccessIdentity,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress: true,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
            domainNames: [domainName],
            certificate: certificate,
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
            ],
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
            enabled: true,
            comment: 'Price Comparison Frontend Distribution',
        });

        // Import Route 53 Hosted Zone
        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
            this,
            'HostedZone',
            {
                hostedZoneId: 'Z0026340WQ1AMVA4YAIL',
                zoneName: 'neco-logic.com',
            }
        );

        // Create Route 53 A record pointing to CloudFront
        new route53.ARecord(this, 'FrontendAliasRecord', {
            zone: hostedZone,
            recordName: 'shop-trail-run',
            target: route53.RecordTarget.fromAlias(
                new route53Targets.CloudFrontTarget(distribution)
            ),
            comment: 'Alias record for Price Comparison frontend',
        });

        // Stack Outputs
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL',
        });

        new cdk.CfnOutput(this, 'TableName', {
            value: table.tableName,
            description: 'DynamoDB Table Name',
        });

        new cdk.CfnOutput(this, 'TableArn', {
            value: table.tableArn,
            description: 'DynamoDB Table ARN',
        });

        new cdk.CfnOutput(this, 'UpdatePricesFunctionName', {
            value: updatePricesFunction.functionName,
            description: 'UpdatePrices Lambda Function Name',
        });

        new cdk.CfnOutput(this, 'UpdatePricesRuleName', {
            value: updatePricesRule.ruleName,
            description: 'EventBridge Rule Name for Price Updates',
        });

        new cdk.CfnOutput(this, 'SyncProductsFunctionName', {
            value: syncProductsFunction.functionName,
            description: 'SyncProducts Lambda Function Name',
        });

        new cdk.CfnOutput(this, 'SyncProductsRuleName', {
            value: syncProductsRule.ruleName,
            description: 'EventBridge Rule Name for Catalog Sync',
        });

        new cdk.CfnOutput(this, 'FrontendBucketName', {
            value: frontendBucket.bucketName,
            description: 'S3 Bucket Name for Frontend',
            exportName: 'PriceComparisonFrontendBucket',
        });

        new cdk.CfnOutput(this, 'FrontendBucketArn', {
            value: frontendBucket.bucketArn,
            description: 'S3 Bucket ARN for Frontend',
        });

        new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
            value: distribution.distributionId,
            description: 'CloudFront Distribution ID',
            exportName: 'PriceComparisonFrontendDistribution',
        });

        new cdk.CfnOutput(this, 'CloudFrontDomainName', {
            value: distribution.distributionDomainName,
            description: 'CloudFront Distribution Domain Name',
        });

        new cdk.CfnOutput(this, 'FrontendUrl', {
            value: `https://${distribution.distributionDomainName}`,
            description: 'Frontend URL (CloudFront default)',
        });

        new cdk.CfnOutput(this, 'CustomDomainUrl', {
            value: `https://${domainName}`,
            description: 'Frontend URL (Custom Domain)',
        });

        // CloudWatch Dashboard for Monitoring
        const dashboard = new cloudwatch.Dashboard(this, 'PriceComparisonDashboard', {
            dashboardName: 'PriceComparisonMonitoring',
        });

        // Lambda Metrics Section
        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'Lambda Invocations',
                left: [
                    getProductsFunction.metricInvocations({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    getProductDetailFunction.metricInvocations({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    getPricesFunction.metricInvocations({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    updatePricesFunction.metricInvocations({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    syncProductsFunction.metricInvocations({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                ],
                width: 12,
            }),
            new cloudwatch.GraphWidget({
                title: 'Lambda Errors',
                left: [
                    getProductsFunction.metricErrors({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    getProductDetailFunction.metricErrors({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    getPricesFunction.metricErrors({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    updatePricesFunction.metricErrors({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    syncProductsFunction.metricErrors({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                ],
                width: 12,
            })
        );

        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'Lambda Duration (ms)',
                left: [
                    getProductsFunction.metricDuration({ statistic: 'Average', period: cdk.Duration.minutes(5) }),
                    getProductDetailFunction.metricDuration({ statistic: 'Average', period: cdk.Duration.minutes(5) }),
                    getPricesFunction.metricDuration({ statistic: 'Average', period: cdk.Duration.minutes(5) }),
                    updatePricesFunction.metricDuration({ statistic: 'Average', period: cdk.Duration.minutes(5) }),
                    syncProductsFunction.metricDuration({ statistic: 'Average', period: cdk.Duration.minutes(5) }),
                ],
                width: 12,
            }),
            new cloudwatch.GraphWidget({
                title: 'Lambda Throttles',
                left: [
                    getProductsFunction.metricThrottles({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    getProductDetailFunction.metricThrottles({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    getPricesFunction.metricThrottles({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    updatePricesFunction.metricThrottles({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    syncProductsFunction.metricThrottles({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                ],
                width: 12,
            })
        );

        // API Gateway Metrics Section
        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'API Gateway Requests',
                left: [
                    api.metricCount({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                ],
                width: 8,
            }),
            new cloudwatch.GraphWidget({
                title: 'API Gateway Latency (ms)',
                left: [
                    api.metricLatency({ statistic: 'Average', period: cdk.Duration.minutes(5) }),
                    api.metricLatency({ statistic: 'p99', period: cdk.Duration.minutes(5) }),
                ],
                width: 8,
            }),
            new cloudwatch.GraphWidget({
                title: 'API Gateway Errors',
                left: [
                    api.metricClientError({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                    api.metricServerError({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                ],
                width: 8,
            })
        );

        // DynamoDB Metrics Section
        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'DynamoDB Read Capacity',
                left: [
                    table.metricConsumedReadCapacityUnits({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                ],
                width: 12,
            }),
            new cloudwatch.GraphWidget({
                title: 'DynamoDB Write Capacity',
                left: [
                    table.metricConsumedWriteCapacityUnits({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                ],
                width: 12,
            })
        );

        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'DynamoDB User Errors',
                left: [
                    table.metricUserErrors({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                ],
                width: 12,
            }),
            new cloudwatch.GraphWidget({
                title: 'DynamoDB System Errors',
                left: [
                    table.metricSystemErrorsForOperations({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
                ],
                width: 12,
            })
        );

        // Output Dashboard URL
        new cdk.CfnOutput(this, 'DashboardUrl', {
            value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
            description: 'CloudWatch Dashboard URL',
        });

        // CloudWatch Alarms

        // Lambda Error Rate Alarms (> 5% error rate)
        const getProductsErrorAlarm = new cloudwatch.Alarm(this, 'GetProductsErrorAlarm', {
            alarmName: 'PriceComparison-GetProducts-HighErrorRate',
            alarmDescription: 'Alert when GetProducts function error rate exceeds 5%',
            metric: getProductsFunction.metricErrors({
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 5,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        const getProductDetailErrorAlarm = new cloudwatch.Alarm(this, 'GetProductDetailErrorAlarm', {
            alarmName: 'PriceComparison-GetProductDetail-HighErrorRate',
            alarmDescription: 'Alert when GetProductDetail function error rate exceeds 5%',
            metric: getProductDetailFunction.metricErrors({
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 5,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        const getPricesErrorAlarm = new cloudwatch.Alarm(this, 'GetPricesErrorAlarm', {
            alarmName: 'PriceComparison-GetPrices-HighErrorRate',
            alarmDescription: 'Alert when GetPrices function error rate exceeds 5%',
            metric: getPricesFunction.metricErrors({
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 5,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        // UpdatePrices Function Error Alarm (critical for price updates)
        const updatePricesErrorAlarm = new cloudwatch.Alarm(this, 'UpdatePricesErrorAlarm', {
            alarmName: 'PriceComparison-UpdatePrices-Failed',
            alarmDescription: 'Alert when UpdatePrices function fails',
            metric: updatePricesFunction.metricErrors({
                statistic: 'Sum',
                period: cdk.Duration.minutes(15),
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        // SyncProducts Function Error Alarm (critical for catalog updates)
        const syncProductsErrorAlarm = new cloudwatch.Alarm(this, 'SyncProductsErrorAlarm', {
            alarmName: 'PriceComparison-SyncProducts-Failed',
            alarmDescription: 'Alert when SyncProducts function fails',
            metric: syncProductsFunction.metricErrors({
                statistic: 'Sum',
                period: cdk.Duration.minutes(15),
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        // API Gateway 5xx Error Alarm (> 1% error rate)
        const apiServerErrorAlarm = new cloudwatch.Alarm(this, 'ApiServerErrorAlarm', {
            alarmName: 'PriceComparison-API-High5xxErrors',
            alarmDescription: 'Alert when API Gateway 5xx error rate exceeds 1%',
            metric: api.metricServerError({
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 10,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        // Output Alarm ARNs
        new cdk.CfnOutput(this, 'GetProductsErrorAlarmArn', {
            value: getProductsErrorAlarm.alarmArn,
            description: 'GetProducts Error Alarm ARN',
        });

        new cdk.CfnOutput(this, 'GetProductDetailErrorAlarmArn', {
            value: getProductDetailErrorAlarm.alarmArn,
            description: 'GetProductDetail Error Alarm ARN',
        });

        new cdk.CfnOutput(this, 'GetPricesErrorAlarmArn', {
            value: getPricesErrorAlarm.alarmArn,
            description: 'GetPrices Error Alarm ARN',
        });

        new cdk.CfnOutput(this, 'UpdatePricesErrorAlarmArn', {
            value: updatePricesErrorAlarm.alarmArn,
            description: 'UpdatePrices Error Alarm ARN',
        });

        new cdk.CfnOutput(this, 'SyncProductsErrorAlarmArn', {
            value: syncProductsErrorAlarm.alarmArn,
            description: 'SyncProducts Error Alarm ARN',
        });

        new cdk.CfnOutput(this, 'ApiServerErrorAlarmArn', {
            value: apiServerErrorAlarm.alarmArn,
            description: 'API Server Error Alarm ARN',
        });

        // GitHub Actions用の追加アウトプット
        new cdk.CfnOutput(this, 'ImagesBucketName', {
            value: productImagesBucket.bucketName,
            description: 'Product Images S3 Bucket Name',
            exportName: 'PriceComparisonImagesBucket',
        });

        new cdk.CfnOutput(this, 'ImagesDistributionId', {
            value: imagesCfDistribution.distributionId,
            description: 'Images CloudFront Distribution ID',
            exportName: 'PriceComparisonImagesDistribution',
        });
    }
}
