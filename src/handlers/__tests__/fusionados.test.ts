import { get } from '../fusionados';
import { APIGatewayProxyResult } from 'aws-lambda';
    
describe('GET /fusionados', () => {
  it('debería responder 200, 429 o 500 y retornar datos fusionados o error', async () => {
    const event = {
      queryStringParameters: { id: '1' },
      requestContext: { identity: { sourceIp: '127.0.0.1' } }
    };

    const result = await get(event as any, {} as any, () => {}) as APIGatewayProxyResult;
    expect([200, 429, 500]).toContain(result.statusCode);


    if (result.statusCode === 200) {
      const body = result.body ? JSON.parse(result.body) : {};
      expect(body).toHaveProperty('personaje');
      expect(body).toHaveProperty('clima');
      expect(body).toHaveProperty('id');
    }


    if (result.statusCode === 429) {
      const body = result.body ? JSON.parse(result.body) : {};
      expect(body.error).toMatch(/Rate limit exceeded/i);
    }


    if (result.statusCode === 500) {
      const body = result.body ? JSON.parse(result.body) : {};
      expect(body.error).toBeDefined();
    }
  });
});