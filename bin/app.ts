#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PriceComparisonStack } from '../lib/price-comparison-stack';

const app = new cdk.App();

new PriceComparisonStack(app, 'PriceComparisonStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    description: 'Trail running shoes price comparison infrastructure',
});
