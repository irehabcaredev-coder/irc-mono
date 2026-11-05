import prisma from '../config/prisma';
import cities from '../data/indian-cities.json';

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Matches starting with the query come first, then matches elsewhere in the name. */
export const searchCities = async (q: string, limit: number) => {
    const query = clean(q);
    if (!query) {
        return prisma.city.findMany({ orderBy: { name: 'asc' }, take: limit });
    }
    const [prefix, contains] = await Promise.all([
        prisma.city.findMany({
            where: { name: { startsWith: query, mode: 'insensitive' } },
            orderBy: { name: 'asc' },
            take: limit,
        }),
        prisma.city.findMany({
            where: {
                name: { contains: query, mode: 'insensitive' },
                NOT: { name: { startsWith: query, mode: 'insensitive' } },
            },
            orderBy: { name: 'asc' },
            take: limit,
        }),
    ]);
    return [...prefix, ...contains].slice(0, limit);
};

/** Returns the existing row for this name + state (case-insensitive) or creates a custom one. */
export const addCity = async (name: string, state: string) => {
    const cityName = clean(name);
    const stateName = clean(state);
    const existing = await prisma.city.findFirst({
        where: {
            name: { equals: cityName, mode: 'insensitive' },
            state: { equals: stateName, mode: 'insensitive' },
        },
    });
    if (existing) return { city: existing, created: false };
    const city = await prisma.city.create({ data: { name: cityName, state: stateName, isCustom: true } });
    return { city, created: true };
};

export const seedCities = async () => {
    const result = await prisma.city.createMany({
        data: cities.map((c) => ({ name: c.city, state: c.state })),
        skipDuplicates: true,
    });
    return result.count;
};
