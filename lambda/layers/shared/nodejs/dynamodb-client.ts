// DynamoDB Client and Helper Functions

import {
    DynamoDBClient,
    PutItemCommand,
    GetItemCommand,
    QueryCommand,
    ScanCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    PutItemCommandInput,
    GetItemCommandInput,
    QueryCommandInput,
    ScanCommandInput,
    UpdateItemCommandInput,
    DeleteItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { DynamoDBItem } from './types';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME || 'PriceComparisonTable';

// Put Item
export async function putItem<T extends DynamoDBItem>(item: T): Promise<void> {
    const params: PutItemCommandInput = {
        TableName: TABLE_NAME,
        Item: marshall(item, { removeUndefinedValues: true }),
    };

    await client.send(new PutItemCommand(params));
}

// Get Item
export async function getItem<T extends DynamoDBItem>(
    pk: string,
    sk: string
): Promise<T | null> {
    const params: GetItemCommandInput = {
        TableName: TABLE_NAME,
        Key: marshall({ PK: pk, SK: sk }),
    };

    const result = await client.send(new GetItemCommand(params));

    if (!result.Item) {
        return null;
    }

    return unmarshall(result.Item) as T;
}

// Query Items
export interface QueryOptions {
    indexName?: string;
    limit?: number;
    exclusiveStartKey?: Record<string, any>;
    scanIndexForward?: boolean;
    filterExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: Record<string, any>;
}

export interface QueryResult<T> {
    items: T[];
    lastEvaluatedKey?: Record<string, any>;
}

export async function queryItems<T extends DynamoDBItem>(
    keyConditionExpression: string,
    expressionAttributeNames: Record<string, string>,
    expressionAttributeValues: Record<string, any>,
    options: QueryOptions = {}
): Promise<QueryResult<T>> {
    const params: QueryCommandInput = {
        TableName: TABLE_NAME,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        IndexName: options.indexName,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey
            ? marshall(options.exclusiveStartKey)
            : undefined,
        ScanIndexForward: options.scanIndexForward,
        FilterExpression: options.filterExpression,
    };

    // Merge additional expression attribute names if filter is used
    if (options.expressionAttributeNames) {
        params.ExpressionAttributeNames = {
            ...params.ExpressionAttributeNames,
            ...options.expressionAttributeNames,
        };
    }

    // Merge additional expression attribute values if filter is used
    if (options.expressionAttributeValues) {
        const marshalledFilterValues = marshall(options.expressionAttributeValues);
        params.ExpressionAttributeValues = {
            ...params.ExpressionAttributeValues,
            ...marshalledFilterValues,
        };
    }

    const result = await client.send(new QueryCommand(params));

    return {
        items: (result.Items || []).map((item) => unmarshall(item) as T),
        lastEvaluatedKey: result.LastEvaluatedKey
            ? unmarshall(result.LastEvaluatedKey)
            : undefined,
    };
}

// Scan Items
export interface ScanOptions {
    limit?: number;
    exclusiveStartKey?: Record<string, any>;
    filterExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: Record<string, any>;
}

export interface ScanResult<T> {
    items: T[];
    lastEvaluatedKey?: Record<string, any>;
}

export async function scanItems<T extends DynamoDBItem>(
    options: ScanOptions = {}
): Promise<ScanResult<T>> {
    const params: ScanCommandInput = {
        TableName: TABLE_NAME,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey
            ? marshall(options.exclusiveStartKey)
            : undefined,
        FilterExpression: options.filterExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues
            ? marshall(options.expressionAttributeValues)
            : undefined,
    };

    const result = await client.send(new ScanCommand(params));

    return {
        items: (result.Items || []).map((item) => unmarshall(item) as T),
        lastEvaluatedKey: result.LastEvaluatedKey
            ? unmarshall(result.LastEvaluatedKey)
            : undefined,
    };
}

// Update Item
export async function updateItem(
    pk: string,
    sk: string,
    updateExpression: string,
    expressionAttributeNames: Record<string, string>,
    expressionAttributeValues: Record<string, any>
): Promise<void> {
    const params: UpdateItemCommandInput = {
        TableName: TABLE_NAME,
        Key: marshall({ PK: pk, SK: sk }),
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
    };

    await client.send(new UpdateItemCommand(params));
}

// Delete Item
export async function deleteItem(pk: string, sk: string): Promise<void> {
    const params: DeleteItemCommandInput = {
        TableName: TABLE_NAME,
        Key: marshall({ PK: pk, SK: sk }),
    };

    await client.send(new DeleteItemCommand(params));
}

// Batch operations can be added here in the future if needed
