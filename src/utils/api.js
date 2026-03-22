async function req(path, options = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export const api = {
  getMembers:    ()        => req('/members'),
  createMember:  (data)    => req('/members',     { method: 'POST', body: data }),
  updateMember:  (id, data)=> req(`/members/${id}`,{ method: 'PUT',  body: data }),
  deleteMember:  (id)      => req(`/members/${id}`,{ method: 'DELETE' }),

  getEntries:    ()        => req('/entries'),
  createEntry:   (data)    => req('/entries',     { method: 'POST', body: data }),
  updateEntry:   (id, data)=> req(`/entries/${id}`,{ method: 'PUT',  body: data }),
  deleteEntry:   (id)      => req(`/entries/${id}`,{ method: 'DELETE' }),

  export:        ()        => req('/export'),
  import:        (data)    => req('/import',      { method: 'POST', body: data }),
}

export async function exportData() {
  const data = await api.export()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wellnesslog-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.members || !data.entries) throw new Error('Invalid format')
        await api.import(data)
        resolve(data)
      } catch (err) { reject(err) }
    }
    reader.readAsText(file)
  })
}

export function getActiveMemberId() {
  return localStorage.getItem('wellness_active_member') || null
}
export function saveActiveMemberId(id) {
  if (id) localStorage.setItem('wellness_active_member', id)
  else localStorage.removeItem('wellness_active_member')
}
