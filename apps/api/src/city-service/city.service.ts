import prisma from '../config/prisma';
import indianCities from '../data/indian-cities.json';
import usCities from '../data/us-cities.json';
import { CountryCode } from '../country-service/country.codes';

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Matches starting with the query come first, then matches elsewhere in the name. Pass a country code to limit to one country. */
export const searchCities = async (q: string, limit: number, country?: CountryCode) => {
    const query = clean(q);
    const inCountry = country ? { country } : {};
    if (!query) {
        return prisma.city.findMany({ where: inCountry, orderBy: { name: 'asc' }, take: limit });
    }
    const [prefix, contains] = await Promise.all([
        prisma.city.findMany({
            where: { ...inCountry, name: { startsWith: query, mode: 'insensitive' } },
            orderBy: { name: 'asc' },
            take: limit,
        }),
        prisma.city.findMany({
            where: {
                ...inCountry,
                name: { contains: query, mode: 'insensitive' },
                NOT: { name: { startsWith: query, mode: 'insensitive' } },
            },
            orderBy: { name: 'asc' },
            take: limit,
        }),
    ]);
    return [...prefix, ...contains].slice(0, limit);
};

/** Returns the existing row for this name + state + country (case-insensitive) or creates a custom one. */
export const addCity = async (name: string, state: string, country: CountryCode) => {
    const cityName = clean(name);
    const stateName = clean(state);
    const existing = await prisma.city.findFirst({
        where: {
            country,
            name: { equals: cityName, mode: 'insensitive' },
            state: { equals: stateName, mode: 'insensitive' },
        },
    });
    if (existing) return { city: existing, created: false };
    const city = await prisma.city.create({ data: { name: cityName, state: stateName, country, isCustom: true } });
    return { city, created: true };
};

export const seedCities = async () => {
    const rows = [
        ...indianCities.map((c) => ({ name: c.city, state: c.state, country: 'IND' })),
        ...usCities.map((c) => ({ name: c.city, state: c.state, country: 'USA' })),
    ];
    const result = await prisma.city.createMany({ data: rows, skipDuplicates: true });
    return result.count;
};
