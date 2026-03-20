const KEYS = {
  MEMBERS: 'wellness_members',
  ENTRIES: 'wellness_entries',
  ACTIVE_MEMBER: 'wellness_active_member',
}

export function getMembers() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.MEMBERS) || '[]')
  } catch { return [] }
}

export function saveMembers(members) {
  localStorage.setItem(KEYS.MEMBERS, JSON.stringify(members))
}

export function getEntries() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.ENTRIES) || '[]')
  } catch { return [] }
}

export function saveEntries(entries) {
  localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries))
}

export function getActiveMemberId() {
  return localStorage.getItem(KEYS.ACTIVE_MEMBER) || null
}

export function saveActiveMemberId(id) {
  localStorage.setItem(KEYS.ACTIVE_MEMBER, id)
}

export function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    members: getMembers(),
    entries: getEntries(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wellnesslog-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.members || !data.entries) throw new Error('Invalid format')
        saveMembers(data.members)
        saveEntries(data.entries)
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsText(file)
  })
}
