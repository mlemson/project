import { useMemo } from 'react'
import type { MoodEntry, TaskItem } from '../../lib/storage/types'
import { isTaskCompleted } from '../../lib/tasks/taskIntelligence'

interface DashboardScreenProps {
  moodEntries: MoodEntry[]
  tasks: TaskItem[]
  today: string
  profileLabel: string
  trackCount: number
  quickCaptureCount: number
}

export function DashboardScreen({
  moodEntries,
  tasks,
  today,
  profileLabel,
  trackCount,
  quickCaptureCount,
}: DashboardScreenProps) {
  const completedCount = tasks.filter((task) => isTaskCompleted(task, today)).length
  const weeklyTasks = tasks.filter((task) => task.cadence === 'weekly').length
  const currentMonth = today.slice(0, 7)
  const monthEntries = moodEntries.filter((entry) => entry.date.startsWith(currentMonth))
  const greenDays = monthEntries.filter((entry) => entry.color === 'green' || entry.color === 'lime').length
  const importantTasks = tasks.filter((task) => task.important && !isTaskCompleted(task, today)).length
  const focusTasks = tasks.filter((task) => !isTaskCompleted(task, today)).sort((left, right) => Number(right.important) - Number(left.important)).slice(0, 3)
  const widgets = useMemo(() => {
    const availableWidgets: Array<{
      title: string
      value?: string | number
      description: string
      lines?: string[]
      hero?: boolean
    }> = [
      {
        title: 'Vandaag focus op',
        description: 'Belangrijkste overzicht voor wat nu direct aandacht verdient.',
        lines: focusTasks.length === 0
          ? ['Geen open taken meer. Ruimte vrij voor herstel of planning.']
          : focusTasks.map((task) => `${task.important ? 'Belangrijk: ' : ''}${task.title}`),
        hero: true,
      },
      {
        title: 'Afgeronde taken',
        value: `${completedCount}/${tasks.length}`,
        description: 'Voortgang zichtbaar houden werkt motiverender dan alleen de open lijst zien.',
      },
      {
        title: 'Wekelijkse routines',
        value: weeklyTasks,
        description: 'Terugkerende blokken verlagen opstartfrictie op drukke dagen.',
      },
      {
        title: 'Belangrijke taken',
        value: importantTasks,
        description: 'Dit zijn de items die het snelst aandacht vragen.',
      },
      {
        title: 'Ideeen',
        value: quickCaptureCount,
        description: 'Losse gedachten die je later kunt omzetten naar echte stappen.',
      },
    ]

    if (profileLabel === 'Prive') {
      availableWidgets.push(
        {
          title: 'Goede dagen deze maand',
          value: greenDays,
          description: 'Een snelle trend van hoe de maand voelt.',
        },
        {
          title: 'Audio in bibliotheek',
          value: trackCount,
          description: 'Mindfulness-audio die lokaal klaarstaat voor een resetmoment.',
        },
      )
    }

    return availableWidgets
  }, [completedCount, focusTasks, greenDays, importantTasks, profileLabel, quickCaptureCount, tasks.length, trackCount, weeklyTasks])

  return (
    <section className="panel card-stack wide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Vandaag in 1 oogopslag</h2>
        </div>
      </div>

      <div className="dashboard-widget-grid">
        {widgets.map((widget) => (
          <article
            key={widget.title}
            className={widget.hero ? 'summary-card dashboard-widget focus-hero-card' : 'summary-card dashboard-widget'}
          >
            <div className="dashboard-widget-head">
              <span className="stat-label">{widget.title}</span>
            </div>
            {widget.value !== undefined && <strong>{widget.value}</strong>}
            {widget.lines?.map((line) => (
              <p key={line} className="focus-line">{line}</p>
            ))}
            <p>{widget.description}</p>
          </article>
        ))}
      </div>

    </section>
  )
}
