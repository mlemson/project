import type { MoodEntry, ProfileId, TaskItem } from '../../lib/storage/types'
import { isTaskCompleted } from '../../lib/tasks/taskIntelligence'

interface StatsScreenProps {
  profileId: ProfileId
  moodEntries: MoodEntry[]
  tasks: TaskItem[]
  today: string
}

export function StatsScreen({ profileId, moodEntries, tasks, today }: StatsScreenProps) {
  const completedCount = tasks.filter((task) => isTaskCompleted(task, today)).length
  const importantOpen = tasks.filter((task) => task.important && !isTaskCompleted(task, today)).length
  const weeklyTasks = tasks.filter((task) => task.cadence === 'weekly').length

  const yearSummary = buildYearSummary(today, moodEntries)

  return (
    <section className="panel card-stack wide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Statistieken</p>
          <h2>{profileId === 'private' ? 'Prive-overzicht' : 'Werkoverzicht'}</h2>
        </div>
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <span className="stat-label">Afgerond</span>
          <strong>{completedCount}/{tasks.length || 0}</strong>
          <p>Laat zien hoeveel van je lijst al verwerkt is.</p>
        </article>
        <article className="summary-card">
          <span className="stat-label">Belangrijke open taken</span>
          <strong>{importantOpen}</strong>
          <p>Helpt om focus te houden op wat nu eerst moet.</p>
        </article>
        <article className="summary-card">
          <span className="stat-label">Wekelijkse ritmes</span>
          <strong>{weeklyTasks}</strong>
          <p>Terugkerende taken geven meer structuur aan je week.</p>
        </article>
      </div>

      {profileId === 'private' && (
        <div className="year-strip">
          <div className="section-heading compact">
            <h3>Jaaroverzicht check-ins</h3>
            <span>{today.slice(0, 4)}</span>
          </div>
          <div className="year-month-grid">
            {yearSummary.map((month) => (
              <article key={month.label} className="year-month-card">
                <div className="section-heading compact">
                  <strong>{month.label}</strong>
                  <span>{month.total}</span>
                </div>
                <div className="year-calendar-grid">
                  {month.cells.map((cell) => (
                    <div
                      key={cell.key}
                      className={cell.entry ? `calendar-cell ${cell.entry.color}` : 'calendar-cell empty'}
                      title={cell.entry ? `${cell.entry.date}: ${cell.entry.label}${cell.entry.note ? ` - ${cell.entry.note}` : ''}` : cell.key}
                    >
                      <span>{cell.dayLabel}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function buildYearSummary(today: string, entries: MoodEntry[]) {
  const yearPrefix = today.slice(0, 4)

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthNumber = String(monthIndex + 1).padStart(2, '0')
    const monthKey = `${yearPrefix}-${monthNumber}`
    const monthEntries = entries.filter((entry) => entry.date.startsWith(monthKey))

    return {
      label: new Date(`${monthKey}-01`).toLocaleDateString('nl-NL', { month: 'short' }),
      total: monthEntries.length,
      goodDays: monthEntries.filter((entry) => entry.color === 'lime' || entry.color === 'green').length,
      cells: buildMonthCells(monthKey, monthEntries),
    }
  })
}

function buildMonthCells(monthKey: string, entries: MoodEntry[]) {
  const [year, month] = monthKey.split('-').map(Number)
  const totalDays = new Date(year, month, 0).getDate()
  const monthMap = new Map(entries.map((entry) => [entry.date, entry]))

  return Array.from({ length: totalDays }, (_, index) => {
    const date = `${monthKey}-${String(index + 1).padStart(2, '0')}`
    return {
      key: date,
      dayLabel: String(index + 1),
      entry: monthMap.get(date),
    }
  })
}