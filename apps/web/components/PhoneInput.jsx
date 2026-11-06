'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { fetchCountries } from '@/lib/countryApi'
import { parseStoredPhone } from '@/lib/phone'

// Only used if /countries cannot be reached, so the form still works
const FALLBACK_COUNTRIES = [
  { iso: 'IN', name: 'India', dialCode: '91', flag: '🇮🇳' },
  { iso: 'US', name: 'United States', dialCode: '1', flag: '🇺🇸' },
]

const DEFAULT_ISO = 'IN'

/**
 * Phone number field with a country code picker.
 * `value` and `onChange` use the full number in E.164 ("+19015020245"), or '' when empty.
 */
export default function PhoneInput({
  value,
  onChange,
  placeholder = 'Phone number',
  inputClassName = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent',
  disabled = false,
}) {
  const { data } = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
    staleTime: Infinity,
    retry: 1,
  })
  const countries = data?.length ? data : FALLBACK_COUNTRIES

  const [iso, setIso] = useState(DEFAULT_ISO)
  const [national, setNational] = useState('')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef(null)

  const selected = countries.find((c) => c.iso === iso) || countries[0]
  const compose = (country, digits) => (digits ? `+${country.dialCode}${digits}` : '')

  // Follow the value when the parent sets it (profile loaded, form reset)
  useEffect(() => {
    if ((value || '') === compose(selected, national)) return
    const parsed = parseStoredPhone(value)
    if (parsed) {
      setIso(parsed.iso || DEFAULT_ISO)
      setNational(parsed.national)
    } else {
      setNational('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^\+/, '')
    if (!q) return countries
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || c.dialCode.startsWith(q)
    )
  }, [countries, search])

  const pickCountry = (c) => {
    setIso(c.iso)
    setOpen(false)
    setSearch('')
    onChange(compose(c, national))
  }

  const changeNational = (raw) => {
    // The full number is at most 15 digits including the country code
    const digits = raw.replace(/\D/g, '').slice(0, 15 - selected.dialCode.length)
    setNational(digits)
    onChange(compose(selected, digits))
  }

  return (
    <div ref={wrapRef} className="relative flex">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        aria-label="Select country code"
        aria-expanded={open}
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span>+{selected.dialCode}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
      <input
        type="tel"
        inputMode="tel"
        value={national}
        disabled={disabled}
        onChange={(e) => changeNational(e.target.value)}
        placeholder={placeholder}
        className={`${inputClassName} !rounded-l-none min-w-0`}
      />

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.iso}
                type="button"
                onClick={() => pickCountry(c)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${c.iso === iso ? 'bg-gray-50' : ''}`}
              >
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="flex-1 truncate text-gray-900">{c.name}</span>
                <span className="text-gray-500">+{c.dialCode}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-3 text-sm text-gray-500">No matching country</div>}
          </div>
        </div>
      )}
    </div>
  )
}
