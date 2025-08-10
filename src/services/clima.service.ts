import axios from 'axios';

const planetCoordinates: Record<string, { lat: number, lon: number }> = {
    'Tatooine': { lat: 33.5, lon: 44.4 },
    'Alderaan': { lat: 40.7, lon: -74.0 },
    'Naboo': { lat: 45.4, lon: -75.7 },
    'Endor': { lat: 48.8, lon: 2.3 }
};

export async function getClima(planetName: string) {
    const coords = planetCoordinates[planetName] || { lat: 0, lon: 0 };
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;
    const response = await axios.get(url);
    return response.data.current_weather;
}