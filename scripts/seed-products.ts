#!/usr/bin/env node

/**
 * Seed Script for Initial Salomon Trail Running Shoes Data
 * 
 * This script populates the DynamoDB table with initial product data
 * for Salomon trail running shoes.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'PriceComparisonTable';

// Product interface
interface Product {
    id: string;
    name: string;
    modelNumber: string;
    brand: string;
    imageUrl: string;
    officialUrl: string;
    category: string;
    createdAt: string;
    updatedAt: string;
}

// Salomon trail running shoes data
const salomonProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Salomon Speedcross 6',
        modelNumber: 'L47452800',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2023-08/L47452800_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/speedcross-6.html',
        category: 'trail-running',
    },
    {
        name: 'Salomon Speedcross 5',
        modelNumber: 'L41109200',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2022-03/L41109200_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/speedcross-5.html',
        category: 'trail-running',
    },
    {
        name: 'Salomon Sense Ride 5',
        modelNumber: 'L47163000',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2023-08/L47163000_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/sense-ride-5.html',
        category: 'trail-running',
    },
    {
        name: 'Salomon Ultra Glide 2',
        modelNumber: 'L47453900',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2023-08/L47453900_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/ultra-glide-2.html',
        category: 'trail-running',
    },
    {
        name: 'Salomon S/Lab Pulsar Trail 2',
        modelNumber: 'L47454000',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2023-08/L47454000_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/s-lab-pulsar-trail-2.html',
        category: 'trail-running',
    },
    {
        name: 'Salomon XA Pro 3D V9',
        modelNumber: 'L47454100',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2023-08/L47454100_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/xa-pro-3d-v9.html',
        category: 'trail-running',
    },
    {
        name: 'Salomon Thundercross',
        modelNumber: 'L47268900',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2023-02/L47268900_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/thundercross.html',
        category: 'trail-running',
    },
    {
        name: 'Salomon Sense Pro 5',
        modelNumber: 'L47163100',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2023-08/L47163100_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/sense-pro-5.html',
        category: 'trail-running',
    },
    {
        name: 'Salomon Wildcross 2',
        modelNumber: 'L47268800',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2023-02/L47268800_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/wildcross-2.html',
        category: 'trail-running',
    },
    {
        name: 'Salomon Supercross 4',
        modelNumber: 'L47268700',
        brand: 'Salomon',
        imageUrl: 'https://www.salomon.com/sites/default/files/styles/product_image/public/2023-02/L47268700_0.png',
        officialUrl: 'https://www.salomon.com/ja-jp/shop/product/supercross-4.html',
        category: 'trail-running',
    },
];

// Convert product to DynamoDB item
function productToItem(product: Product) {
    const productId = product.id;
    return {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA',
        GSI1PK: `BRAND#${product.brand}`,
        GSI1SK: `PRODUCT#${productId}`,
        entityType: 'product',
        name: product.name,
        modelNumber: product.modelNumber,
        brand: product.brand,
        imageUrl: product.imageUrl,
        officialUrl: product.officialUrl,
        category: product.category,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };
}

// Insert product into DynamoDB
async function insertProduct(product: Product): Promise<void> {
    const item = productToItem(product);

    try {
        await docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: item,
            })
        );
        console.log(`✓ Inserted: ${product.name} (${product.id})`);
    } catch (error) {
        console.error(`✗ Failed to insert ${product.name}:`, error);
        throw error;
    }
}

// Main seed function
async function seedProducts(): Promise<void> {
    console.log('Starting product seed...');
    console.log(`Table: ${TABLE_NAME}`);
    console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log(`Products to insert: ${salomonProducts.length}\n`);

    const timestamp = new Date().toISOString();
    let successCount = 0;
    let failureCount = 0;

    for (const productData of salomonProducts) {
        const product: Product = {
            ...productData,
            id: uuidv4(),
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        try {
            await insertProduct(product);
            successCount++;
        } catch (error) {
            failureCount++;
            console.error(`Failed to insert product: ${product.name}`);
        }
    }

    console.log('\n=== Seed Summary ===');
    console.log(`Total products: ${salomonProducts.length}`);
    console.log(`Successfully inserted: ${successCount}`);
    console.log(`Failed: ${failureCount}`);

    if (failureCount > 0) {
        process.exit(1);
    }
}

// Run the seed script
seedProducts()
    .then(() => {
        console.log('\n✓ Seed completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Seed failed:', error);
        process.exit(1);
    });
