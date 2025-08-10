import { get } from '../historial';
import { APIGatewayProxyResult } from 'aws-lambda';

describe('GET /historial', () => {
  it('debería responder 200 o 500 y retornar historial paginado o error', async () => {
    const event = {
      queryStringParameters: {},
      requestContext: { identity: { sourceIp: '127.0.0.1' } }
    };

    const result = await get(event as any, {} as any, () => {}) as APIGatewayProxyResult;
    expect([200, 500]).toContain(result.statusCode);

    if (result.statusCode === 200) {
      const body = result.body ? JSON.parse(result.body) : {};
      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('page');
      expect(body).toHaveProperty('pageSize');
    }

    if (result.statusCode === 500) {
      const body = result.body ? JSON.parse(result.body) : {};
      expect(body.error).toBeDefined();
    }
  });
});

export {};