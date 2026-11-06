import { isValidPhoneNumber } from 'libphonenumber-js/max';

// Numbers are stored in E.164 (+ country code, digits only), which is also what wa.me and tel: links need
export const isValidInternationalPhone = (value: string) => /^\+\d+$/.test(value) && isValidPhoneNumber(value);

export const PHONE_ERROR = 'Enter a valid phone number with its country code';
