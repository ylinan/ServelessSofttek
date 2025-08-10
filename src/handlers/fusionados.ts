import { APIGatewayProxyHandler } from 'aws-lambda';
import { getRandom, getPersonaje } from '../services/swapi.service';
import { getClima } from '../services/clima.service';
import { saveFusionado, getCache, setCache, checkRateLimit } from '../services/dynamodb.service';
import { Personaje } from '../models/fusionado.model';
import { v4 as uuidv4 } from 'uuid';
import * as AWSXRay from 'aws-xray-sdk';
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.captureHTTPsGlobal(require('https'));

export const get: APIGatewayProxyHandler = async (event) => {
    const segment = AWSXRay.getSegment() || AWSXRay.captureFunc('fusionadosHandler', () => {});
    const start = Date.now();
    console.log(`[INFO] Inicio handler /fusionados`, { requestId: event.requestContext?.requestId });
    const ip = event.requestContext?.identity?.sourceIp || 'unknown';
    const allowed = await checkRateLimit(`fusionados-${ip}`, 15, 10 * 60 * 1000);
    if (!allowed) {
        console.warn(`[WARN] Rate limite alcanzado para IP `, { ip });
        segment?.addAnnotation('rateLimit', 'excedido');
        segment?.close();
        return {
            statusCode: 429,
            body: JSON.stringify({ error: 'Rate limit exceeded. Try again later.' })
        };
    }
    try {
        segment?.addAnnotation('ip', ip);
        const idParam = event.queryStringParameters?.id;
        const personId = idParam ? Number(idParam) : Math.floor(Math.random() * 5) + 1;
        segment?.addAnnotation('personId', personId);
        let source = 'cache';
        const personajeCacheKey = `fusionado-${personId}`;
        console.log(`[INFO] Consultando cache para id`, { personId });
        let fusionadoCache = await getCache(personajeCacheKey);
        if (fusionadoCache) {
            console.log(`[INFO] Cache hit para id`, { personId });
            segment?.addAnnotation('cache', 'hit');
            segment?.close();
            console.log(`[PERF] Tiempo de ejecución: ${Date.now() - start}ms`);
            return {
                statusCode: 200,
                body: JSON.stringify({ ...fusionadoCache, source })
            };
        }
        console.log(`[INFO] Cache miss para id`, { personId });
        segment?.addAnnotation('cache', 'miss');
        let personaje = await getRandom(personId);
        let planet = await getPersonaje(personaje.homeworld);
        let clima = await getClima(planet.name);
        source = 'api';
        const fusionadoId = uuidv4();
        const personajeFusionado: Personaje = {
            id: fusionadoId,
            personaje: {
                name: personaje.name,
                height: isNaN(Number(personaje.height)) ? 0 : Number(personaje.height),
                mass: isNaN(Number(personaje.mass)) ? 0 : Number(personaje.mass),
                gender: personaje.gender,
                homeworld: planet.name,
            },
            clima: {
                temperature: isNaN(Number(clima.temperature)) ? 0 : Number(clima.temperature),
                windspeed: isNaN(Number(clima.windspeed)) ? 0 : Number(clima.windspeed),
                weathercode: isNaN(Number(clima.weathercode)) ? 0 : Number(clima.weathercode),
            },
            createdAt: new Date().toISOString()
        };
        await saveFusionado(personajeFusionado);
        await setCache(personajeCacheKey, personajeFusionado, 30);
        segment?.addAnnotation('fusionadoId', fusionadoId);
        segment?.close();
        console.log(`[INFO] Registro fusionado guardado en DynamoDB y cache`, { fusionadoId });
        console.log(`[PERF] Tiempo de ejecución: ${Date.now() - start}ms`);
        return {
            statusCode: 200,
            body: JSON.stringify({ ...personajeFusionado, source })
        };
    } catch (error) {
        segment?.addAnnotation('error', error instanceof Error ? error.message : String(error));
        segment?.close();
        console.error(`[ERROR] Handler /fusionados`, { error });
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        };
    }
};