import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js/min'

// Numbers are kept in E.164 ("+" and digits only), which is what the API stores and what wa.me / tel: need.

export const PHONE_ERROR = 'Enter a valid phone number for the selected country'

export const isValidE164 = (value) => !!value && /^\+\d+$/.test(value) && isValidPhoneNumber(value)

// Splits a stored number into { iso, national }. Numbers saved before country codes existed may be bare
// 10-digit Indian numbers, so those are read as India.
export function parseStoredPhone(value) {
  if (!value) return null
  const parsed = parsePhoneNumberFromString(value, 'IN')
  if (!parsed) return null
  // +44 mobiles cannot be told apart between the UK and the Crown Dependencies; show the UK
  const iso = ['GG', 'JE', 'IM'].includes(parsed.country) ? 'GB' : parsed.country
  return { iso, dialCode: parsed.countryCallingCode, national: parsed.nationalNumber }
}

// wa.me wants the full international number as digits, without "+"
export function whatsappUrl(value) {
  const parsed = parsePhoneNumberFromString(value || '', 'IN')
  const digits = parsed ? parsed.number.replace(/\D/g, '') : (value || '').replace(/\D/g, '')
  return `https://wa.me/${digits}`
}
