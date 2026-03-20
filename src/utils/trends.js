import { parseISO, differenceInDays, format, subDays, eachDayOfInterval } from 'date-fns'

export function getMostFrequentFoods(entries, memberId, limit = 10) {
  const foods = entries
    .filter(e => e.memberId === memberId && e.type === 'food')
    .map(e => e.title.split(',').map(f => f.trim()))
    .flat()
    .filter(Boolean)

  const counts = {}
  foods.forEach(f => { counts[f] = (counts[f] || 0) + 1 })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

export function getSymptomFrequency(entries, memberId, days = 30) {
  const cutoff = subDays(new Date(), days)
  const symptoms = entries.filter(e =>
    e.memberId === memberId &&
    e.type === 'symptom' &&
    parseISO(e.date) >= cutoff
  )

  const counts = {}
  symptoms.forEach(s => {
    counts[s.title] = (counts[s.title] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

export function getFoodSymptomCorrelations(entries, memberId) {
  const memberEntries = entries.filter(e => e.memberId === memberId)
  const foods = memberEntries.filter(e => e.type === 'food')
  const symptoms = memberEntries.filter(e => e.type === 'symptom')

  const correlations = {}

  foods.forEach(food => {
    const foodDate = parseISO(food.date)
    const relatedSymptoms = symptoms.filter(s => {
      const diff = differenceInDays(parseISO(s.date), foodDate)
      return diff >= 0 && diff <= 3
    })

    if (relatedSymptoms.length > 0) {
      const foodItems = food.title.split(',').map(f => f.trim())
      foodItems.forEach(item => {
        if (!item) return
        if (!correlations[item]) correlations[item] = { symptoms: {}, count: 0 }
        correlations[item].count++
        relatedSymptoms.forEach(s => {
          correlations[item].symptoms[s.title] = (correlations[item].symptoms[s.title] || 0) + 1
        })
      })
    }
  })

  return Object.entries(correlations)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
}

export function getMedicationFrequency(entries, memberId, days = 30) {
  const cutoff = subDays(new Date(), days)
  const meds = entries.filter(e =>
    e.memberId === memberId &&
    e.type === 'medication' &&
    parseISO(e.date) >= cutoff
  )

  const counts = {}
  meds.forEach(m => { counts[m.title] = (counts[m.title] || 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

export function getSymptomTimeline(entries, memberId, days = 30) {
  const cutoff = subDays(new Date(), days)
  const range = eachDayOfInterval({ start: cutoff, end: new Date() })

  return range.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const daySymptoms = entries.filter(e =>
      e.memberId === memberId &&
      e.type === 'symptom' &&
      e.date === dateStr
    )
    return { date: dateStr, count: daySymptoms.length }
  })
}
