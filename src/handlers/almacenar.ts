import * as AWSXRay from 'aws-xray-sdk';
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.captureHTTPsGlobal(require('https'));
import { APIGatewayProxyHandler } from 'aws-lambda';
import { saveCliente } from '../services/dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { Cliente } from '../models/cliente.model';

export const post: APIGatewayProxyHandler = async (event) => {
    const segment = AWSXRay.getSegment() || AWSXRay.captureFunc('almacenarHandler', () => {});
    const start = Date.now();
    console.log(`[INFO] Inicio handler /almacenar`, { requestId: event.requestContext?.requestId });
    try {
        const { nombre, apellido, edad, correo } = JSON.parse(event.body || '{}');
        if (!nombre || !apellido || !edad || !correo) {
            console.error(`[ERROR] Datos incompletos en /almacenar`, { nombre, apellido, edad, correo });
            segment?.addAnnotation('error', 'Datos incompletos');
            segment?.close();
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Todos los campos son requeridos: nombre, apellido, edad, correo' })
            };
        }
        const cliente: Cliente = {
            id: uuidv4(),
            nombre,
            apellido,
            edad: isNaN(Number(edad)) ? 0 : Number(edad),
            correo,
            createdAt: new Date().toISOString()
        };
        await saveCliente(cliente);
        segment?.addAnnotation('clienteId', cliente.id);
        segment?.close();
        console.log(`[INFO] Cliente guardado en DynamoDB`, { clienteId: cliente.id });
        console.log(`[PERF] Tiempo de ejecución: ${Date.now() - start}ms`);
        return {
            statusCode: 201,
            body: JSON.stringify(cliente)
        };
    } catch (error) {
        segment?.addAnnotation('error', error instanceof Error ? error.message : String(error));
        segment?.close();
        console.error(`[ERROR] Handler /almacenar`, { error });
        return {
            statusCode: 400,
            body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        };
    }
};  