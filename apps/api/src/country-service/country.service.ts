import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

export type Country = { iso: string; name: string; dialCode: string; flag: string };

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

// Regional indicator letters spell the flag emoji for a two-letter country code
const flagFor = (iso: string) => String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

// Every region libphonenumber knows a calling code for, built once at startup
export const COUNTRIES: Country[] = getCountries()
    .map((iso) => ({
        iso,
        name: regionNames.of(iso) ?? iso,
        dialCode: getCountryCallingCode(iso),
        flag: flagFor(iso),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
