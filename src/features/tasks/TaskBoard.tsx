import { useMemo, useState } from 'react'
import {
  DEFAULT_TASK_DURATION_MINUTES,
  buildTaskActions,
  createDefaultIntegrations,
  getWeekdayLabel,
  isTaskCompleted,
  openTaskCalendar,
  parseTaskDraft,
} from '../../lib/tasks/taskIntelligence'
import type { FocusTimerState, TaskItem, Weekday } from '../../lib/storage/types'

interface TaskBoardProps {
  tasks: TaskItem[]
  today: string
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onAddTask: (task: Omit<TaskItem, 'id' | 'completed' | 'createdAt' | 'completionDate'>) => void
  activeTimer?: FocusTimerState
  onStartTimer: (taskId: string, durationMinutes: number) => void
  onPauseTimer: () => void
  onResumeTimer: () => void
  profileLabel: string
}

export function TaskBoard({
  tasks,
  today,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  activeTimer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  profileLabel,
}: TaskBoardProps) {
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Structuur')
  const [cadence, setCadence] = useState<'once' | 'weekly'>('once')
  const [weeklyDay, setWeeklyDay] = useState<Weekday>('monday')
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_TASK_DURATION_MINUTES)
  const [reminderHint, setReminderHint] = useState('')
  const [important, setImportant] = useState(false)
  const [integrations, setIntegrations] = useState(createDefaultIntegrations())
  const [voiceSupported] = useState(() => {
    return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  })
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null)

  const openTasks = useMemo(
    () => tasks.filter((task) => !isTaskCompleted(task, today)).sort(sortTasks),
    [tasks, today],
  )
  const completedTasks = useMemo(
    () => tasks.filter((task) => isTaskCompleted(task, today)).sort(sortTasks),
    [tasks, today],
  )

  const startVoiceCapture = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition) {
      setVoiceStatus('Spraakherkenning wordt in deze browser niet ondersteund.')
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'nl-NL'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    setVoiceStatus('Luistert... spreek je taak hardop uit.')

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? ''
      if (transcript) {
        const parsed = parseTaskDraft(transcript, category)
        setTitle(parsed.title)
        setCategory(parsed.category)
        setCadence(parsed.cadence)
        setWeeklyDay(parsed.weeklyDay ?? 'monday')
        setReminderHint(parsed.reminderHint)
        setImportant(parsed.important)
        setVoiceStatus('Transcript slim omgezet naar taakvoorstel.')
      }
    }

    recognition.onerror = () => {
      setVoiceStatus('Spraakherkenning mislukte. Probeer het opnieuw of typ handmatig.')
    }

    recognition.start()
  }

  const resetForm = () => {
    setTitle('')
    setCategory('Structuur')
    setCadence('once')
    setWeeklyDay('monday')
    setDurationMinutes(DEFAULT_TASK_DURATION_MINUTES)
    setReminderHint('')
    setImportant(false)
    setIntegrations(createDefaultIntegrations())
  }

  const submitTask = () => {
    if (!title.trim()) {
      return
    }

    const parsed = parseTaskDraft(title, category.trim() || 'Algemeen')

    onAddTask({
      title: parsed.title,
      category: parsed.category,
      cadence: cadence === 'weekly' ? 'weekly' : parsed.cadence,
      weeklyDay: (cadence === 'weekly' ? weeklyDay : parsed.weeklyDay) ?? undefined,
      durationMinutes: Math.max(1, durationMinutes),
      reminderHint: reminderHint.trim() || parsed.reminderHint,
      important: important || parsed.important,
      integrations,
    })

    const actions = buildTaskActions({
      title: parsed.title,
      category: parsed.category,
      reminderHint: reminderHint.trim() || parsed.reminderHint,
    })

    if (integrations.calendar) {
      openTaskCalendar({
        title: parsed.title,
        category: parsed.category,
        reminderHint: reminderHint.trim() || parsed.reminderHint,
      })
    }
    if (integrations.mail) {
      window.location.href = actions.mailUrl
    }
    if (integrations.alarm) {
      void navigator.clipboard.writeText(actions.alarmText)
    }

    resetForm()
    setIsCreatingTask(false)
    setVoiceStatus(null)
  }

  return (
    <section className="panel card-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Taken</p>
          <h2>{profileLabel === 'Werk' ? 'Werk helder en uitvoerbaar houden' : 'Vandaag klein en haalbaar houden'}</h2>
        </div>
        <button type="button" className="secondary-button" onClick={() => setIsCreatingTask((current) => !current)}>
          {isCreatingTask ? 'Sluit taken toevoegen' : 'Taken toevoegen'}
        </button>
      </div>

      {isCreatingTask && <div className="task-form">
        <label className="field">
          <span>Nieuwe taak</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Bijvoorbeeld: morgen afspraak bevestigen"
          />
        </label>

        <div className="inline-fields">
          <label className="field">
            <span>Categorie</span>
            <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Werk, thuis, zelfzorg" />
          </label>
          <label className="field">
            <span>Herhaling</span>
            <select value={cadence} onChange={(event) => setCadence(event.target.value as 'once' | 'weekly')}>
              <option value="once">Eenmalig</option>
              <option value="weekly">Wekelijks</option>
            </select>
          </label>
          <label className="field">
            <span>Duur in minuten</span>
            <input
              type="number"
              min={1}
              step={1}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Math.max(1, Number(event.target.value) || DEFAULT_TASK_DURATION_MINUTES))}
            />
          </label>
        </div>

        {cadence === 'weekly' && (
          <label className="field">
            <span>Op welke dag?</span>
            <select value={weeklyDay} onChange={(event) => setWeeklyDay(event.target.value as Weekday)}>
              <option value="monday">Maandag</option>
              <option value="tuesday">Dinsdag</option>
              <option value="wednesday">Woensdag</option>
              <option value="thursday">Donderdag</option>
              <option value="friday">Vrijdag</option>
              <option value="saturday">Zaterdag</option>
              <option value="sunday">Zondag</option>
            </select>
          </label>
        )}

        <label className="field">
          <span>Reminder hint</span>
          <input
            value={reminderHint}
            onChange={(event) => setReminderHint(event.target.value)}
            placeholder="Bijvoorbeeld: zet in agenda op woensdag 08:30"
          />
        </label>

        <label className="toggle-row">
          <input checked={important} onChange={(event) => setImportant(event.target.checked)} type="checkbox" />
          <span>Belangrijke taak rood markeren</span>
        </label>

        <div className="integration-block">
          <span className="field-label">Direct koppelen bij opslaan</span>
          <label className="toggle-row">
            <input checked={integrations.calendar} onChange={(event) => setIntegrations((current) => ({ ...current, calendar: event.target.checked }))} type="checkbox" />
            <span>Agenda openen</span>
          </label>
          <label className="toggle-row">
            <input checked={integrations.alarm} onChange={(event) => setIntegrations((current) => ({ ...current, alarm: event.target.checked }))} type="checkbox" />
            <span>Wekkertekst kopieren</span>
          </label>
          <label className="toggle-row">
            <input checked={integrations.mail} onChange={(event) => setIntegrations((current) => ({ ...current, mail: event.target.checked }))} type="checkbox" />
            <span>Mail opstellen</span>
          </label>
        </div>

        <div className="action-row">
          <button className="primary-button" type="button" onClick={submitTask}>
            Voeg taak toe
          </button>
          <button className="secondary-button" type="button" onClick={startVoiceCapture} disabled={!voiceSupported}>
            {voiceSupported ? 'Spraak naar taak' : 'Spraak niet beschikbaar'}
          </button>
        </div>

        {voiceStatus && <p className="helper-copy">{voiceStatus}</p>}
      </div>}

      <div className="task-section">
        <div className="section-heading compact">
          <h3>Open taken</h3>
          <span>{openTasks.length}</span>
        </div>
        <div className="task-list">
          {openTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              activeTimer={activeTimer}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onResumeTimer={onResumeTimer}
              showFocusControls
            />
          ))}
          {openTasks.length === 0 && <p className="empty-copy">Geen open taken. Mooi moment voor een nieuwe kleine stap.</p>}
        </div>
      </div>

      <div className="task-section completed-section">
        <div className="section-heading compact">
          <h3>Afgeronde taken</h3>
          <span>{completedTasks.length}</span>
        </div>
        <div className="task-list">
          {completedTasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggleTask={onToggleTask} onDeleteTask={onDeleteTask} />
          ))}
          {completedTasks.length === 0 && <p className="empty-copy">Afgeronde taken verschijnen hier onderaan.</p>}
        </div>
      </div>
    </section>
  )
}

interface TaskCardProps {
  task: TaskItem
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  activeTimer?: FocusTimerState
  onStartTimer?: (taskId: string, durationMinutes: number) => void
  onPauseTimer?: () => void
  onResumeTimer?: () => void
  showFocusControls?: boolean
}

function TaskCard({
  task,
  onToggleTask,
  onDeleteTask,
  activeTimer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  showFocusControls = false,
}: TaskCardProps) {
  const actions = buildTaskActions(task)
  const isTimerOnTask = activeTimer?.taskId === task.id && activeTimer.status !== 'finished'
  const focusStatusLabel = isTimerOnTask
    ? activeTimer?.status === 'paused'
      ? 'Focus gepauzeerd'
      : 'Focus actief'
    : null
  const timerButtonLabel = isTimerOnTask
    ? activeTimer?.status === 'running'
      ? 'Pauzeer focus'
      : 'Hervat focus'
    : 'Start focus'

  const handleTimerAction = () => {
    if (!showFocusControls) {
      return
    }

    if (isTimerOnTask && activeTimer?.status === 'running') {
      onPauseTimer?.()
      return
    }

    if (isTimerOnTask && activeTimer?.status === 'paused') {
      onResumeTimer?.()
      return
    }

    onStartTimer?.(task.id, task.durationMinutes)
  }

  return (
    <article key={task.id} className={task.completed ? 'task-card completed' : isTimerOnTask ? 'task-card active-focus' : task.important ? 'task-card important' : 'task-card'}>
      <button
        type="button"
        className={task.completed ? 'check-button checked' : 'check-button'}
        onClick={() => onToggleTask(task.id)}
        aria-label={task.completed ? `Markeer ${task.title} als open` : `Markeer ${task.title} als afgerond`}
      >
        {task.completed ? '✓' : ''}
      </button>
      <div className="task-copy">
        <div className="task-meta">
          <span className="pill">{task.cadence === 'weekly' ? 'Wekelijks' : 'Eenmalig'}</span>
          {task.cadence === 'weekly' && task.weeklyDay && <span className="pill muted">{getWeekdayLabel(task.weeklyDay)}</span>}
          <span className="pill muted">{task.durationMinutes} min</span>
          <span className="pill muted">{task.category}</span>
          {task.important && <span className="pill danger">Belangrijk</span>}
          {focusStatusLabel && <span className="pill success">{focusStatusLabel}</span>}
        </div>
        <h3>{task.title}</h3>
        <p>{task.reminderHint}</p>
        <div className="task-links">
          {showFocusControls && (
            <button type="button" className="mini-button mini-button-strong" onClick={handleTimerAction}>
              {timerButtonLabel}
            </button>
          )}
          <button type="button" className="mini-button" onClick={() => openTaskCalendar(task)}>
            Agenda
          </button>
          <button type="button" className="mini-button" onClick={() => { window.location.href = actions.mailUrl }}>
            Mail
          </button>
          <button type="button" className="mini-button" onClick={() => void navigator.clipboard.writeText(actions.alarmText)}>
            Wekkertekst
          </button>
        </div>
      </div>
      <button type="button" className="ghost-button" onClick={() => onDeleteTask(task.id)}>
        Verwijder
      </button>
    </article>
  )
}

function sortTasks(left: TaskItem, right: TaskItem) {
  if (left.important !== right.important) {
    return left.important ? -1 : 1
  }

  return right.createdAt.localeCompare(left.createdAt)
}
