import * as AWSXRay from 'aws-xray-sdk';
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.captureHTTPsGlobal(require('https'));
import { DynamoDB } from 'aws-sdk';
import { Personaje } from '../models/fusionado.model';
import { Cliente } from '../models/cliente.model';

const dynamodb = new DynamoDB.DocumentClient();
const fusionadosTable = process.env.DYNAMODB_TABLE || '';
const clientesTable = process.env.CLIENTES_TABLE || '';
const cacheTable = process.env.CACHE_TABLE || '';
const rateLimitTable = process.env.RATELIMIT_TABLE || '';

export async function saveFusionado(fusionado: Personaje) {
    try {
        await dynamodb.put({
            TableName: fusionadosTable,
            Item: fusionado
        }).promise();
        console.log(`[INFO] Fusionado guardado en DynamoDB `, { fusionadoId: fusionado.id });
    } catch (error) {
        console.error(`[ERROR] Guardando fusionado en DynamoDB `, { error });
        throw error;
    }
}

export async function saveCliente(cliente: Cliente) {
    try {
        await dynamodb.put({
            TableName: clientesTable,
            Item: cliente
        }).promise();
        console.log(`[INFO] Cliente guardado en DynamoDB`, { clienteId: cliente.id });
    } catch (error) {
        console.error(`[ERROR] Guardando cliente en DynamoDB`, { error });
        throw error;
    }
}

export async function getFusionadosHistory(limit: number, lastKey?: string) {
    try {
        const result = await dynamodb.scan({
            TableName: fusionadosTable,
            Limit: limit,
            ExclusiveStartKey: lastKey ? { id: lastKey } : undefined
        }).promise();
        console.log(`[INFO] Historial obtenido de DynamoDB`, { count: result.Items?.length });
        return result;
    } catch (error) {
        console.error(`[ERROR] Obteniendo historial de DynamoDB`, { error });
        throw error;
    }
}

export async function getCache(cacheKey: string) {
    try {
        const result = await dynamodb.get({
            TableName: cacheTable,
            Key: { cacheKey }
        }).promise();
        if (result.Item && result.Item.expiresAt > Date.now()) {
            console.log(`[INFO] Cache hit`, { cacheKey });
            return result.Item.data;
        }
        console.log(`[INFO] Cache miss`, { cacheKey });
        return null;
    } catch (error) {
        console.error(`[ERROR] Consultando cache en DynamoDB`, { error });
        throw error;
    }
}

export async function setCache(cacheKey: string, data: any, ttlMinutes: number = 30) {
    try {
        const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
        await dynamodb.put({
            TableName: cacheTable,
            Item: { cacheKey, data, expiresAt }
        }).promise();
        console.log(`[INFO] Cache guardada en DynamoDB`, { cacheKey });
    } catch (error) {
        console.error(`[ERROR] Guardando cache en DynamoDB`, { error });
        throw error;
    }
}

export async function checkRateLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const segment = AWSXRay.getSegment() || AWSXRay.captureFunc('checkRateLimit', () => {});
    const now = Date.now();
    const windowStart = now - windowMs;
    const result = await dynamodb.query({
        TableName: rateLimitTable,
        KeyConditionExpression: 'rateKey = :k and #ts > :w',
        ExpressionAttributeNames: {
            '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
            ':k': key,
            ':w': windowStart
        }
    }).promise();
    segment?.addAnnotation('rateKey', key);
    segment?.addAnnotation('requestCount', result.Items?.length || 0);
    if ((result.Items?.length || 0) >= maxRequests) {
        segment?.addAnnotation('rateLimit', 'exceeded');
        segment?.close();
        return false;
    }
    await dynamodb.put({
        TableName: rateLimitTable,
        Item: { rateKey: key, timestamp: now }
    }).promise();
    segment?.close();
    return true;
}