import * as dynamodbService from '../../services/dynamodb.service';
import { post } from '../almacenar';
import { APIGatewayProxyResult } from 'aws-lambda';


jest.spyOn(dynamodbService, 'saveCliente').mockResolvedValue(undefined);

describe('POST /almacenar', () => {
  it('debería responder 400 si los datos son incompletos', async () => {
    const event = { body: JSON.stringify({ nombre: 'Yerson' }) };
    const result = await post(event as any, {} as any, () => {}) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
    const body = result.body ? JSON.parse(result.body) : {};
    expect(body.error)
      .toBe('Todos los campos son requeridos: nombre, apellido, edad, correo');
  });

  it('debería responder 201 si los datos son válidos', async () => {
    const event = { body: JSON.stringify({ nombre: 'Yerson', apellido: 'Cervantes', edad: 30, correo: 'yerson@correo.com' }) };
    const result = await post(event as any, {} as any, () => {}) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(201);
    const body = result.body ? JSON.parse(result.body) : {};
      expect(body.nombre).toBe('Yerson');
      expect(body.apellido).toBe('Cervantes');
    expect(body.edad).toBe(30);
      expect(body.correo).toBe('yerson@correo.com');
  });
});