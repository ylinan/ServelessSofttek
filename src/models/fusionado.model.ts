export interface Personaje {
    id: string;
    personaje: {
        name: string;
        height: number;
        mass: number;
        gender: string;
        homeworld: string;
    };
    clima: {
        temperature: number; 
        windspeed: number;   
        weathercode: number;
    };
    createdAt: string;
}
