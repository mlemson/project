import { useEffect, useMemo, useState } from 'react'
import { getLocale } from '../../lib/i18n'
import { isTaskCompleted, wasTaskCompletedOnDate } from '../../lib/tasks/taskIntelligence'
import type { AppLanguage, MoodEntry, ProfileId, TaskItem } from '../../lib/storage/types'

interface StatsScreenProps {
  language: AppLanguage
  profileId: ProfileId
  moodEntries: MoodEntry[]
  tasks: TaskItem[]
  today: string
}

export function StatsScreen({ language, profileId, moodEntries, tasks, today }: StatsScreenProps) {
  const completedToday = tasks.filter((task) => wasTaskCompletedOnDate(task, today)).length
  const importantOpen = tasks.filter((task) => task.important && !isTaskCompleted(task, today)).length
  const trackedTasks = tasks.filter((task) => task.tracked)
  const [selectedTrackedTaskId, setSelectedTrackedTaskId] = useState<string>(trackedTasks[0]?.id ?? '')

  useEffect(() => {
    setSelectedTrackedTaskId((current) => {
      if (trackedTasks.some((task) => task.id === current)) {
        return current
      }

      return trackedTasks[0]?.id ?? ''
    })
  }, [trackedTasks])

  const selectedTrackedTask = trackedTasks.find((task) => task.id === selectedTrackedTaskId)
  const yearSummary = useMemo(() => buildYearSummary(today, moodEntries, language), [today, moodEntries, language])
  const trackedSummary = useMemo(
    () => buildTrackedYearSummary(today, selectedTrackedTask?.completionHistory ?? [], language),
    [language, selectedTrackedTask?.completionHistory, today],
  )

  return (
    <section className="panel card-stack wide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Stats' : 'Statistieken'}</p>
          <h2>{language === 'en' ? `${profileId === 'private' ? 'Private' : 'Work'} overview` : `${profileId === 'private' ? 'Prive' : 'Werk'}overzicht`}</h2>
        </div>
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <span className="stat-label">{language === 'en' ? 'Completed today' : 'Vandaag afgerond'}</span>
          <strong>{completedToday}</strong>
          <p>{language === 'en' ? 'Keeps visible what already moved forward today.' : 'Houdt zichtbaar wat vandaag al vooruitging.'}</p>
        </article>
        <article className="summary-card">
          <span className="stat-label">{language === 'en' ? 'Important open tasks' : 'Belangrijke open taken'}</span>
          <strong>{importantOpen}</strong>
          <p>{language === 'en' ? 'Helps you stay honest about what still needs attention.' : 'Helpt om eerlijk te blijven over wat nog aandacht vraagt.'}</p>
        </article>
        <article className="summary-card">
          <span className="stat-label">{language === 'en' ? 'Tracked tasks' : 'Getrackte taken'}</span>
          <strong>{trackedTasks.length}</strong>
          <p>{language === 'en' ? 'Choose one below to inspect its completion pattern.' : 'Kies er hieronder een om het afrondpatroon te bekijken.'}</p>
        </article>
      </div>

      {profileId === 'private' && (
        <div className="year-strip">
          <div className="section-heading compact">
            <h3>{language === 'en' ? 'Check-ins this year' : 'Check-ins dit jaar'}</h3>
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

      <div className="year-strip">
        <div className="section-heading compact">
          <h3>{language === 'en' ? 'Tracked task history' : 'Geschiedenis van getrackte taken'}</h3>
          <span>{trackedTasks.length}</span>
        </div>

        {trackedTasks.length > 0 ? (
          <>
            <label className="field">
              <span>{language === 'en' ? 'Tracked task' : 'Getrackte taak'}</span>
              <select value={selectedTrackedTaskId} onChange={(event) => setSelectedTrackedTaskId(event.target.value)}>
                {trackedTasks.map((task) => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>
            </label>

            <div className="year-month-grid">
              {trackedSummary.map((month) => (
                <article key={month.label} className="year-month-card">
                  <div className="section-heading compact">
                    <strong>{month.label}</strong>
                    <span>{month.total}</span>
                  </div>
                  <div className="year-calendar-grid">
                    {month.cells.map((cell) => (
                      <div
                        key={cell.key}
                        className={cell.completed ? 'calendar-cell green' : 'calendar-cell empty'}
                        title={cell.completed ? `${selectedTrackedTask?.title}: ${cell.key}` : cell.key}
                      >
                        <span>{cell.dayLabel}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="empty-copy">{language === 'en' ? 'Turn on tracking for one or more tasks to see history here.' : 'Zet tracking aan voor een of meer taken om hier historie te zien.'}</p>
        )}
      </div>
    </section>
  )
}

function buildYearSummary(today: string, entries: MoodEntry[], language: AppLanguage) {
  const yearPrefix = today.slice(0, 4)

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthNumber = String(monthIndex + 1).padStart(2, '0')
    const monthKey = `${yearPrefix}-${monthNumber}`
    const monthEntries = entries.filter((entry) => entry.date.startsWith(monthKey))

    return {
      label: new Date(`${monthKey}-01`).toLocaleDateString(getLocale(language), { month: 'short' }),
      total: monthEntries.length,
      cells: buildMoodMonthCells(monthKey, monthEntries),
    }
  })
}

function buildTrackedYearSummary(today: string, completionHistory: string[], language: AppLanguage) {
  const yearPrefix = today.slice(0, 4)
  const completedSet = new Set(completionHistory.filter((date) => date.startsWith(yearPrefix)))

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthNumber = String(monthIndex + 1).padStart(2, '0')
    const monthKey = `${yearPrefix}-${monthNumber}`
    const cells = buildTrackedMonthCells(monthKey, completedSet)

    return {
      label: new Date(`${monthKey}-01`).toLocaleDateString(getLocale(language), { month: 'short' }),
      total: cells.filter((cell) => cell.completed).length,
      cells,
    }
  })
}

function buildMoodMonthCells(monthKey: string, entries: MoodEntry[]) {
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

function buildTrackedMonthCells(monthKey: string, completedSet: Set<string>) {
  const [year, month] = monthKey.split('-').map(Number)
  const totalDays = new Date(year, month, 0).getDate()

  return Array.from({ length: totalDays }, (_, index) => {
    const date = `${monthKey}-${String(index + 1).padStart(2, '0')}`
    return {
      key: date,
      dayLabel: String(index + 1),
      completed: completedSet.has(date),
    }
  })
}