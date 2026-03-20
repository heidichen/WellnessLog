import { useApp } from '../../context/AppContext'
import { MEMBER_COLORS } from '../../utils/constants'
import EntryCard from './EntryCard'

export default function DayEntries({ entries }) {
  const { members } = useApp()

  // Collect unique member IDs in order of first appearance
  const memberOrder = []
  const byMember = {}
  entries.forEach(e => {
    if (!byMember[e.memberId]) {
      byMember[e.memberId] = []
      memberOrder.push(e.memberId)
    }
    byMember[e.memberId].push(e)
  })

  // Single member — no section headers needed
  if (memberOrder.length <= 1) {
    return (
      <div className="space-y-2">
        {entries.map(e => <EntryCard key={e.id} entry={e} hideMember />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {memberOrder.map(memberId => {
        const member = members.find(m => m.id === memberId)
        const color = MEMBER_COLORS.find(c => c.id === member?.color)?.hex || '#8a8078'
        return (
          <div key={memberId}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color }}>
                {member?.name || 'Unknown'}
              </span>
            </div>
            <div className="space-y-2">
              {byMember[memberId].map(e => <EntryCard key={e.id} entry={e} hideMember />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
