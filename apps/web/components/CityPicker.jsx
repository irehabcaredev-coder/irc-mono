'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Plus, Loader2 } from 'lucide-react'
import { searchCities, addCity } from '@/lib/cityApi'

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent'

/**
 * Searchable city dropdown backed by the City table, with an "Add city" option
 * when what was typed is not in the list.
 *
 * onSelect receives { name, state } for a picked or newly added city.
 * `state` prefills the state field of the add form.
 * allowAdd={false} makes it search-only (filters); onClear fires when the text is emptied.
 */
export default function CityPicker({
  value,
  state = '',
  onSelect,
  placeholder = 'Search city',
  className = inputClass,
  usePatientToken = false,
  allowAdd = true,
  onClear,
}) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newState, setNewState] = useState(state)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)

  // Follow the value when the parent changes it (e.g. profile loaded after mount)
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    if (!open || adding) return
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const rows = await searchCities(query)
        if (!cancelled) setResults(rows)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, open, adding])

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setAdding(false)
        setError('')
        setQuery(value || '')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [value])

  const pick = (city) => {
    setQuery(city.name)
    setOpen(false)
    setAdding(false)
    onSelect({ name: city.name, state: city.state })
  }

  const trimmed = query.trim()
  const exact = results.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())

  const startAdd = () => {
    setNewState(state)
    setError('')
    setAdding(true)
  }

  const submitAdd = async () => {
    if (trimmed.length < 2 || newState.trim().length < 2) {
      setError('Enter the city and its state')
      return
    }
    setSaving(true)
    setError('')
    try {
      const city = await addCity(trimmed, newState.trim(), { usePatientToken })
      pick(city)
    } catch (e) {
      setError(e?.message || 'Could not add city')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!e.target.value.trim()) onClear?.()
          setOpen(true)
          setAdding(false)
        }}
        onFocus={() => setOpen(true)}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
      />

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {adding ? (
            <div className="p-3 space-y-2">
              <p className="text-sm text-gray-700">
                Add <span className="font-semibold">{trimmed}</span> as a new city
              </p>
              <input
                type="text"
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                placeholder="State"
              />
              {error && <p className="text-xs text-accent-red">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitAdd}
                  disabled={saving}
                  className="px-3 py-1.5 bg-primary-blue text-white text-sm rounded-md disabled:opacity-50"
                >
                  {saving ? 'Adding…' : 'Add city'}
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <>
              {loading && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                </div>
              )}
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                >
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-900">{c.name}</span>
                  <span className="text-gray-500">{c.state}</span>
                </button>
              ))}
              {!loading && results.length === 0 && trimmed && (
                <div className="px-4 py-3 text-sm text-gray-500">No matching city</div>
              )}
              {allowAdd && trimmed.length >= 2 && !exact && !loading && (
                <button
                  type="button"
                  onClick={startAdd}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-primary-blue border-t border-gray-100 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" /> Add &quot;{trimmed}&quot; as a new city
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
