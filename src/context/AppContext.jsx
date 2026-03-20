import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api, getActiveMemberId, saveActiveMemberId } from '../utils/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [members, setMembers] = useState([])
  const [entries, setEntries] = useState([])
  const [activeMemberId, setActiveMemberIdState] = useState(null)
  const [filterMemberId, setFilterMemberId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getMembers(), api.getEntries()])
      .then(([m, e]) => {
        setMembers(m)
        setEntries(e)
        const saved = getActiveMemberId()
        const validId = m.find(x => x.id === saved) ? saved : m[0]?.id || null
        setActiveMemberIdState(validId)
      })
      .finally(() => setLoading(false))
  }, [])

  const setActiveMemberId = useCallback((id) => {
    setActiveMemberIdState(id)
    saveActiveMemberId(id)
  }, [])

  const addMember = useCallback(async (data) => {
    const newMember = await api.createMember(data)
    setMembers(prev => [...prev, newMember])
    setActiveMemberIdState(prev => {
      if (!prev) saveActiveMemberId(newMember.id)
      return prev || newMember.id
    })
    return newMember
  }, [])

  const updateMember = useCallback(async (id, data) => {
    const updated = await api.updateMember(id, data)
    setMembers(prev => prev.map(m => m.id === id ? updated : m))
  }, [])

  const deleteMember = useCallback(async (id) => {
    await api.deleteMember(id)
    setEntries(prev => prev.filter(e => e.memberId !== id))
    setMembers(prev => {
      const next = prev.filter(m => m.id !== id)
      setActiveMemberIdState(curr => {
        if (curr !== id) return curr
        const newId = next[0]?.id || null
        saveActiveMemberId(newId)
        return newId
      })
      return next
    })
  }, [])

  const addEntry = useCallback(async (data) => {
    const newEntry = await api.createEntry(data)
    setEntries(prev => [newEntry, ...prev])
    return newEntry
  }, [])

  const updateEntry = useCallback(async (id, data) => {
    const updated = await api.updateEntry(id, data)
    setEntries(prev => prev.map(e => e.id === id ? updated : e))
  }, [])

  const deleteEntry = useCallback(async (id) => {
    await api.deleteEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const getAutocomplete = useCallback((memberId, type, query) => {
    if (!query || query.length < 1) return []
    const q = query.toLowerCase()
    const items = entries
      .filter(e => e.memberId === memberId && e.type === type)
      .flatMap(e => e.title.split(',').map(t => t.trim()).filter(Boolean))
      .filter(t => t.toLowerCase().includes(q) && t.toLowerCase() !== q)
    return [...new Set(items)].slice(0, 8)
  }, [entries])

  const reloadData = useCallback(async () => {
    const [m, e] = await Promise.all([api.getMembers(), api.getEntries()])
    setMembers(m)
    setEntries(e)
  }, [])

  return (
    <AppContext.Provider value={{
      members, entries, activeMemberId, filterMemberId, setFilterMemberId, loading,
      activeMember: members.find(m => m.id === activeMemberId) || null,
      setActiveMemberId, addMember, updateMember, deleteMember,
      addEntry, updateEntry, deleteEntry, getAutocomplete, reloadData,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
