import { createContext, useContext, useState } from 'react'
import en from './en.json'
import zh from './zh.json'

const translations = { en, zh }
const LanguageContext = createContext(null)

function resolve(obj, key) {
  return key.split('.').reduce((acc, k) => acc?.[k], obj)
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en')

  function t(key, options = {}) {
    const dict = translations[lang] || translations.en

    // Pluralization: if count provided, try key_one / key_other
    let resolvedKey = key
    if (options.count !== undefined) {
      const pluralKey = options.count === 1 ? `${key}_one` : `${key}_other`
      if (resolve(dict, pluralKey) !== undefined) resolvedKey = pluralKey
    }

    const value = resolve(dict, resolvedKey)
    if (value === undefined) return key           // fallback: show key
    if (typeof value !== 'string') return value   // arrays etc. returned as-is

    // Interpolation: replace {{name}} with options.name
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => options[k] ?? `{{${k}}}`)
  }

  function toggleLang() {
    const next = lang === 'en' ? 'zh' : 'en'
    setLang(next)
    localStorage.setItem('lang', next)
  }

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useT must be used within LanguageProvider')
  return ctx
}
