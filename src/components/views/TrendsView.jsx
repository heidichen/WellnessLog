import { useState } from 'react'
import { useT } from '../../i18n/LanguageContext.jsx'
import { useApp } from '../../context/AppContext'
import { ENTRY_TYPES } from '../../utils/constants'
import {
  getMostFrequentFoods, getSymptomFrequency, getFoodSymptomCorrelations,
  getMedicationFrequency, getSymptomTimeline,
} from '../../utils/trends'

function Bar({ label, count, max, color }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-body text-[12px] text-muted w-28 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-surface2 rounded h-2 overflow-hidden">
        <div className="h-2 rounded transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-[12px] text-muted w-6 text-right">{count}</span>
    </div>
  )
}

function TrendCard({ title, subtitle, children }) {
  return (
    <div className="bg-surface border border-border rounded-card p-5">
      <h3 className="font-display text-[16px] font-medium text-ink mb-0.5">{title}</h3>
      {subtitle && <p className="text-[12px] text-muted mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  )
}

export default function TrendsView() {
  const { members, entries, filterMemberId } = useApp()
  const { t } = useT()
  const memberId = filterMemberId || members[0]?.id || ''
  const [days, setDays] = useState(30)

  if (members.length === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <div className="text-4xl mb-3">📊</div>
        <p className="font-display text-lg">{t('trends.noMembers')}</p>
      </div>
    )
  }

  const foods = getMostFrequentFoods(entries, memberId)
  const symptoms = getSymptomFrequency(entries, memberId, days)
  const correlations = getFoodSymptomCorrelations(entries, memberId)
  const meds = getMedicationFrequency(entries, memberId, days)
  const timeline = getSymptomTimeline(entries, memberId, days)
  const maxTimeline = Math.max(...timeline.map(d => d.count), 1)

  const activeMemberColor = '#c8956c'
  const memberName = filterMemberId ? members.find(m => m.id === filterMemberId)?.name : t('trends.allMembers')

  return (
    <div>
      {/* Period picker */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] text-muted">
          {memberName} · {t('trends.trendsLabel')}
        </p>
        <div className="flex gap-1 bg-surface2 rounded-full p-0.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${days === d ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Symptom timeline */}
        <TrendCard title={t('trends.symptomTimeline')} subtitle={t('trends.symptomTimelineSubtitle', { days })}>
          {timeline.every(d => d.count === 0)
            ? <p className="text-[13px] text-muted">{t('trends.noSymptoms')}</p>
            : <div className="flex items-end gap-0.5 h-16">
                {timeline.map(d => (
                  <div key={d.date} title={`${d.date}: ${d.count}`}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${(d.count / maxTimeline) * 100}%`,
                      minHeight: d.count > 0 ? '4px' : '2px',
                      backgroundColor: d.count > 0 ? activeMemberColor : '#f4f1ec',
                    }}
                  />
                ))}
              </div>
          }
        </TrendCard>

        {/* Foods */}
        <TrendCard title={t('trends.mostFrequentFoods')} subtitle={t('trends.allTime')}>
          {foods.length === 0
            ? <p className="text-[13px] text-muted">{t('trends.noFoods')}</p>
            : <div className="space-y-2">
                {foods.map(([food, count]) => (
                  <Bar key={food} label={food} count={count} max={foods[0][1]} color={ENTRY_TYPES.food.color} />
                ))}
              </div>
          }
        </TrendCard>

        {/* Symptoms */}
        <TrendCard title={t('trends.symptomFrequency')} subtitle={t('trends.lastNDays', { days })}>
          {symptoms.length === 0
            ? <p className="text-[13px] text-muted">{t('trends.noSymptoms')}</p>
            : <div className="space-y-2">
                {symptoms.map(([s, count]) => (
                  <Bar key={s} label={s} count={count} max={symptoms[0][1]} color={ENTRY_TYPES.symptom.color} />
                ))}
              </div>
          }
        </TrendCard>

        {/* Correlations */}
        <TrendCard title={t('trends.foodSymptom')} subtitle={t('trends.foodSymptomSubtitle')}>
          {correlations.length === 0
            ? <p className="text-[13px] text-muted">{t('trends.noCorrelations')}</p>
            : <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="text-left font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px] pb-2 border-b border-border">{t('trends.foodCol')}</th>
                    <th className="text-left font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px] pb-2 border-b border-border">{t('trends.symptomsAfterCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {correlations.map(([food, data]) => (
                    <tr key={food} className="border-b border-surface2">
                      <td className="py-2 font-medium text-ink">{food}</td>
                      <td className="py-2">
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(data.symptoms).map(([sym, cnt]) => (
                            <span key={sym} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#fce8e8', color: '#c0392b' }}>
                              {sym} ×{cnt}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </TrendCard>

        {/* Medications */}
        <TrendCard title={t('trends.medicationFrequency')} subtitle={t('trends.lastNDays', { days })}>
          {meds.length === 0
            ? <p className="text-[13px] text-muted">{t('trends.noMedications')}</p>
            : <div className="space-y-2">
                {meds.map(([med, count]) => (
                  <Bar key={med} label={med} count={count} max={meds[0][1]} color={ENTRY_TYPES.medication.color} />
                ))}
              </div>
          }
        </TrendCard>
      </div>
    </div>
  )
}
