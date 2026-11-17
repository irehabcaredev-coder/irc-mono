// Countries we store on profiles and cities, as ISO 3166-1 alpha-3 codes.
// Add a code here (and its city list in city.service.ts) to support a new country.
export const SUPPORTED_COUNTRY_CODES = ['IND', 'USA'] as const;
export type CountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number];
