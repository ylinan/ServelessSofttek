import * as AWSXRay from 'aws-xray-sdk';
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.captureHTTPsGlobal(require('https'));
import { APIGatewayProxyHandler } from 'aws-lambda';
import { getFusionadosHistory } from '../services/dynamodb.service';
import { paginate } from '../utils/pagination';

export const get: APIGatewayProxyHandler = async (event) => {
    const segment = AWSXRay.getSegment() || AWSXRay.captureFunc('historialHandler', () => {});
    const start = Date.now();
    console.log(`[INFO] Inicio handler /historial`, { requestId: event.requestContext?.requestId });
    try {
        const limit = event.queryStringParameters?.limit
            ? Number(event.queryStringParameters.limit)
            : 10;
        const page = event.queryStringParameters?.page
            ? Number(event.queryStringParameters.page)
            : 1;
        const lastKey = event.queryStringParameters?.lastKey;
        segment?.addAnnotation('page', page);
        segment?.addAnnotation('limit', limit);
        segment?.addAnnotation('lastKey', lastKey ?? '');
        console.log(`[INFO] Paginando historial`, { limit, page, lastKey });
        const result = await getFusionadosHistory(1000, lastKey); 
        const items = result.Items || [];
        items.sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return b.createdAt.localeCompare(a.createdAt);
        });

        const paginated = paginate(items, page, limit);
        segment?.addAnnotation('totalItems', items.length);
        segment?.close();
        console.log(`[INFO] Historial paginado`, { page, pageSize: limit, total: items.length });
        console.log(`[PERF] Tiempo de ejecución: ${Date.now() - start}ms`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                items: paginated.items,
                lastKey: paginated.lastKey ?? null,
                page,
                pageSize: limit
            })
        };
    } catch (error) {
        segment?.addAnnotation('error', error instanceof Error ? error.message : String(error));
        segment?.close();
        console.error(`[ERROR] Handler /historial`, { error });
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        };
    }
};