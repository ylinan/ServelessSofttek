import axios from 'axios';

export async function getRandom(id?: number) {
    const personId = id ?? Math.floor(Math.random() * 5) + 1;
    const url = `https://swapi.py4e.com/api/people/${personId}/`;
    const response = await axios.get(url);
    return response.data;
}

export async function getPersonaje(PersonajeUrl: string) {
    const response = await axios.get(PersonajeUrl);
    return response.data;
}