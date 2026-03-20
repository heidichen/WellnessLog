import { useState, useRef, useEffect } from 'react'

export default function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder, className = '' }) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { setHighlighted(0) }, [suggestions.length])

  function handleSelect(s) {
    onSelect ? onSelect(s) : onChange(s)
    setOpen(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleKey(e) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && suggestions[highlighted]) { e.preventDefault(); handleSelect(suggestions[highlighted]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className={`w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-bg text-ink placeholder-muted outline-none transition-colors focus:border-accent ${className}`}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-card shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`px-3 py-2 text-sm cursor-pointer ${i === highlighted ? 'bg-surface2 text-ink' : 'text-ink hover:bg-surface2'}`}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setHighlighted(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
