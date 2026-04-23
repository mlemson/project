import { useMemo } from 'react'
import { isTaskCompleted } from '../../lib/tasks/taskIntelligence'
import type { AppLanguage, MoodEntry, TaskItem } from '../../lib/storage/types'

interface DashboardScreenProps {
  language: AppLanguage
  moodEntries: MoodEntry[]
  tasks: TaskItem[]
  today: string
  profileLabel: string
  trackCount: number
  quickCaptureCount: number
}

export function DashboardScreen({
  language,
  moodEntries,
  tasks,
  today,
  profileLabel,
  trackCount,
  quickCaptureCount,
}: DashboardScreenProps) {
  const completedCount = tasks.filter((task) => isTaskCompleted(task, today)).length
  const weeklyTasks = tasks.filter((task) => task.cadence === 'weekly').length
  const trackedTasks = tasks.filter((task) => task.tracked).length
  const currentMonth = today.slice(0, 7)
  const monthEntries = moodEntries.filter((entry) => entry.date.startsWith(currentMonth))
  const greenDays = monthEntries.filter((entry) => entry.color === 'green' || entry.color === 'lime').length
  const importantTasks = tasks.filter((task) => task.important && !isTaskCompleted(task, today)).length
  const focusTasks = tasks.filter((task) => !isTaskCompleted(task, today)).sort((left, right) => Number(right.important) - Number(left.important)).slice(0, 3)

  const widgets = useMemo(() => {
    const items: Array<{
      title: string
      value?: string | number
      lines?: string[]
      hero?: boolean
    }> = [
      {
        title: language === 'en' ? 'Focus now' : 'Focus nu',
        lines: focusTasks.length === 0
          ? [language === 'en' ? 'No open tasks left.' : 'Geen open taken meer.']
          : focusTasks.map((task) => `${task.important ? `${language === 'en' ? 'Important' : 'Belangrijk'}: ` : ''}${task.title}`),
        hero: true,
      },
      {
        title: language === 'en' ? 'Completed' : 'Afgerond',
        value: `${completedCount}/${tasks.length}`,
      },
      {
        title: language === 'en' ? 'Important open' : 'Belangrijke open',
        value: importantTasks,
      },
      {
        title: language === 'en' ? 'Weekly routines' : 'Wekelijkse routines',
        value: weeklyTasks,
      },
      {
        title: language === 'en' ? 'Tracked tasks' : 'Getrackte taken',
        value: trackedTasks,
      },
      {
        title: language === 'en' ? 'Ideas' : 'Ideeen',
        value: quickCaptureCount,
      },
    ]

    if (profileLabel === (language === 'en' ? 'Private' : 'Prive')) {
      items.push(
        {
          title: language === 'en' ? 'Good days this month' : 'Goede dagen deze maand',
          value: greenDays,
        },
        {
          title: language === 'en' ? 'Mindfulness tracks' : 'Mindfulness tracks',
          value: trackCount,
        },
      )
    }

    return items
  }, [completedCount, focusTasks, greenDays, importantTasks, language, profileLabel, quickCaptureCount, tasks.length, trackCount, trackedTasks, weeklyTasks])

  return (
    <section className="panel card-stack wide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Dashboard' : 'Dashboard'}</p>
          <h2>{language === 'en' ? `${profileLabel} at a glance` : `${profileLabel} in een oogopslag`}</h2>
        </div>
      </div>

      <div className="dashboard-widget-grid compact-dashboard-grid">
        {widgets.map((widget) => (
          <article
            key={widget.title}
            className={widget.hero ? 'summary-card dashboard-widget focus-hero-card' : 'summary-card dashboard-widget compact-widget'}
          >
            <div className="dashboard-widget-head">
              <span className="stat-label">{widget.title}</span>
            </div>
            {widget.value !== undefined && <strong>{widget.value}</strong>}
            {widget.lines?.map((line) => (
              <p key={line} className="focus-line">{line}</p>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}