import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_TASK_DURATION_MINUTES,
  buildTaskActions,
  createDefaultIntegrations,
  getWeekdayLabel,
  isTaskCompleted,
  isTaskVisibleToday,
  openTaskCalendar,
  parseTaskDraft,
  wasTaskCompletedOnDate,
} from '../../lib/tasks/taskIntelligence'
import { getWeekdayOptions } from '../../lib/i18n'
import type { AppLanguage, FocusTimerState, TaskItem, Weekday } from '../../lib/storage/types'

interface TaskBoardProps {
  tasks: TaskItem[]
  today: string
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onAddTask: (task: Omit<TaskItem, 'id' | 'completed' | 'createdAt' | 'completionDate' | 'completionHistory'>) => void
  activeTimer?: FocusTimerState
  onStartTimer: (taskId: string, durationMinutes: number) => void
  onPauseTimer: () => void
  onResumeTimer: () => void
  profileLabel: string
  language: AppLanguage
  categories: string[]
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
  language,
  categories,
}: TaskBoardProps) {
  const defaultCategory = categories[0] ?? (language === 'en' ? 'General' : 'Algemeen')
  const weekdayOptions = getWeekdayOptions(language)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [cadence, setCadence] = useState<'once' | 'weekly' | 'daily'>('once')
  const [weeklyDay, setWeeklyDay] = useState<Weekday>('monday')
  const [weekdays, setWeekdays] = useState<Weekday[]>(['monday'])
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_TASK_DURATION_MINUTES)
  const [reminderHint, setReminderHint] = useState('')
  const [important, setImportant] = useState(false)
  const [tracked, setTracked] = useState(false)
  const [integrations, setIntegrations] = useState(createDefaultIntegrations())
  const [voiceSupported] = useState(() => {
    return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  })
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!categories.includes(category)) {
      setCategory(defaultCategory)
    }
  }, [categories, category, defaultCategory])

  const openTasks = useMemo(
    () => tasks.filter((task) => isTaskVisibleToday(task, today) && !isTaskCompleted(task, today)).sort(sortTasks),
    [tasks, today],
  )
  const completedTasksToday = useMemo(
    () => tasks.filter((task) => wasTaskCompletedOnDate(task, today)).sort(sortTasks),
    [tasks, today],
  )

  const startVoiceCapture = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition) {
      setVoiceStatus(language === 'en' ? 'Speech recognition is not supported in this browser.' : 'Spraakherkenning wordt in deze browser niet ondersteund.')
      return
    }

    const recognition = new Recognition()
    recognition.lang = language === 'en' ? 'en-US' : 'nl-NL'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    setVoiceStatus(language === 'en' ? 'Listening... say your task out loud.' : 'Luistert... spreek je taak hardop uit.')

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? ''
      if (transcript) {
        const parsed = parseTaskDraft(transcript, category, language)
        setTitle(parsed.title)
        setCategory(parsed.category)
        setCadence(parsed.cadence)
        setWeeklyDay(parsed.weeklyDay ?? 'monday')
        setWeekdays(parsed.weekdays ?? ['monday'])
        setReminderHint(parsed.reminderHint)
        setImportant(parsed.important)
        setVoiceStatus(language === 'en' ? 'Transcript turned into a task suggestion.' : 'Transcript slim omgezet naar taakvoorstel.')
      }
    }

    recognition.onerror = () => {
      setVoiceStatus(language === 'en' ? 'Speech recognition failed. Try again or type manually.' : 'Spraakherkenning mislukte. Probeer het opnieuw of typ handmatig.')
    }

    recognition.start()
  }

  const resetForm = () => {
    setTitle('')
    setCategory(defaultCategory)
    setCadence('once')
    setWeeklyDay('monday')
    setWeekdays(['monday'])
    setDurationMinutes(DEFAULT_TASK_DURATION_MINUTES)
    setReminderHint('')
    setImportant(false)
    setTracked(false)
    setIntegrations(createDefaultIntegrations())
  }

  const submitTask = () => {
    if (!title.trim()) {
      return
    }

    const parsed = parseTaskDraft(title, category.trim() || defaultCategory, language)
    const nextCategory = category.trim() || parsed.category
    const nextReminder = reminderHint.trim() || parsed.reminderHint

    onAddTask({
      title: parsed.title,
      category: nextCategory,
      cadence,
      weeklyDay: cadence === 'weekly' ? weeklyDay : undefined,
      weekdays: cadence === 'daily' ? weekdays : undefined,
      durationMinutes: Math.max(1, durationMinutes),
      reminderHint: nextReminder,
      important: important || parsed.important,
      tracked,
      integrations,
    })

    const actions = buildTaskActions({
      title: parsed.title,
      category: nextCategory,
      reminderHint: nextReminder,
    })

    if (integrations.calendar) {
      openTaskCalendar({
        title: parsed.title,
        category: nextCategory,
        reminderHint: nextReminder,
      })
    }
    if (integrations.mail) {
      window.location.href = actions.mailUrl
    }

    resetForm()
    setIsCreatingTask(false)
    setVoiceStatus(null)
  }

  return (
    <section className="panel card-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Tasks' : 'Taken'}</p>
          <h2>{language === 'en' ? `${profileLabel} tasks for today` : `${profileLabel} taken voor vandaag`}</h2>
        </div>
        <button
          type="button"
          className="secondary-button icon-button"
          onClick={() => setIsCreatingTask((current) => !current)}
          aria-label={language === 'en' ? 'Add task' : 'Taak toevoegen'}
        >
          +
        </button>
      </div>

      {isCreatingTask && <div className="task-form">
        <label className="field">
          <span>{language === 'en' ? 'New task' : 'Nieuwe taak'}</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={language === 'en' ? 'For example: confirm appointment tomorrow' : 'Bijvoorbeeld: morgen afspraak bevestigen'}
          />
        </label>

        <div className="inline-fields task-inline-grid">
          <label className="field">
            <span>{language === 'en' ? 'Category' : 'Categorie'}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{language === 'en' ? 'Repeat' : 'Herhaling'}</span>
            <select value={cadence} onChange={(event) => setCadence(event.target.value as 'once' | 'weekly' | 'daily')}>
              <option value="once">{language === 'en' ? 'One-off' : 'Eenmalig'}</option>
              <option value="weekly">{language === 'en' ? 'Weekly' : 'Wekelijks'}</option>
              <option value="daily">{language === 'en' ? 'Daily' : 'Dagelijks'}</option>
            </select>
          </label>
          <label className="field">
            <span>{language === 'en' ? 'Duration in minutes' : 'Duur in minuten'}</span>
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
            <span>{language === 'en' ? 'Which day?' : 'Op welke dag?'}</span>
            <select value={weeklyDay} onChange={(event) => setWeeklyDay(event.target.value as Weekday)}>
              {weekdayOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        )}

        {cadence === 'daily' && (
          <div className="field">
            <span>{language === 'en' ? 'Show on these days' : 'Toon op deze dagen'}</span>
            <div className="weekday-picker">
              {weekdayOptions.map((option) => {
                const selected = weekdays.includes(option.value)

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={selected ? 'weekday-chip active' : 'weekday-chip'}
                    onClick={() => setWeekdays((current) => {
                      if (selected) {
                        return current.length === 1 ? current : current.filter((item) => item !== option.value)
                      }

                      return [...current, option.value]
                    })}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <label className="field">
          <span>{language === 'en' ? 'Reminder hint' : 'Reminder hint'}</span>
          <input
            value={reminderHint}
            onChange={(event) => setReminderHint(event.target.value)}
            placeholder={language === 'en' ? 'For example: add to calendar on Wednesday 08:30' : 'Bijvoorbeeld: zet in agenda op woensdag 08:30'}
          />
        </label>

        <label className="toggle-row">
          <input checked={important} onChange={(event) => setImportant(event.target.checked)} type="checkbox" />
          <span>{language === 'en' ? 'Mark as important' : 'Belangrijke taak markeren'}</span>
        </label>

        <label className="toggle-row">
          <input checked={tracked} onChange={(event) => setTracked(event.target.checked)} type="checkbox" />
          <span>{language === 'en' ? 'Track this task in statistics' : 'Track deze taak in statistieken'}</span>
        </label>

        <div className="integration-block">
          <span className="field-label">{language === 'en' ? 'After saving' : 'Na opslaan'}</span>
          <label className="toggle-row">
            <input checked={integrations.calendar} onChange={(event) => setIntegrations((current) => ({ ...current, calendar: event.target.checked }))} type="checkbox" />
            <span>{language === 'en' ? 'Put in calendar' : 'Zet in agenda'}</span>
          </label>
          <label className="toggle-row">
            <input checked={integrations.mail} onChange={(event) => setIntegrations((current) => ({ ...current, mail: event.target.checked }))} type="checkbox" />
            <span>{language === 'en' ? 'Draft email' : 'Stel mail op'}</span>
          </label>
        </div>

        <div className="action-row">
          <button className="primary-button" type="button" onClick={submitTask}>
            {language === 'en' ? 'Save task' : 'Bewaar taak'}
          </button>
          <button className="secondary-button" type="button" onClick={startVoiceCapture} disabled={!voiceSupported}>
            {voiceSupported
              ? language === 'en' ? 'Speech to task' : 'Spraak naar taak'
              : language === 'en' ? 'Speech unavailable' : 'Spraak niet beschikbaar'}
          </button>
        </div>

        {voiceStatus && <p className="helper-copy">{voiceStatus}</p>}
      </div>}

      <div className="task-section">
        <div className="section-heading compact">
          <h3>{language === 'en' ? 'Open tasks' : 'Open taken'}</h3>
          <span>{openTasks.length}</span>
        </div>
        <div className="task-list">
          {openTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              language={language}
              isCompletedToday={false}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              activeTimer={activeTimer}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onResumeTimer={onResumeTimer}
              showFocusControls
            />
          ))}
          {openTasks.length === 0 && <p className="empty-copy">{language === 'en' ? 'No open tasks. Good moment for your next small step.' : 'Geen open taken. Mooi moment voor een nieuwe kleine stap.'}</p>}
        </div>
      </div>

      <div className="task-section completed-section">
        <div className="section-heading compact">
          <h3>{language === 'en' ? 'Completed today' : 'Vandaag afgerond'}</h3>
          <span>{completedTasksToday.length}</span>
        </div>
        <div className="task-list">
          {completedTasksToday.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              language={language}
              isCompletedToday
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
          {completedTasksToday.length === 0 && <p className="empty-copy">{language === 'en' ? 'Tasks completed today show up here.' : 'Taken die je vandaag afrondt verschijnen hier.'}</p>}
        </div>
      </div>
    </section>
  )
}

interface TaskCardProps {
  task: TaskItem
  language: AppLanguage
  isCompletedToday: boolean
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
  language,
  isCompletedToday,
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
      ? language === 'en' ? 'Focus paused' : 'Focus gepauzeerd'
      : language === 'en' ? 'Focus active' : 'Focus actief'
    : null
  const timerButtonLabel = isTimerOnTask
    ? activeTimer?.status === 'running'
      ? language === 'en' ? 'Pause focus' : 'Pauzeer focus'
      : language === 'en' ? 'Resume focus' : 'Hervat focus'
    : language === 'en' ? 'Start focus' : 'Start focus'

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
    <article className={isCompletedToday ? 'task-card completed' : isTimerOnTask ? 'task-card active-focus' : task.important ? 'task-card important' : 'task-card'}>
      <button
        type="button"
        className={isCompletedToday ? 'check-button checked' : 'check-button'}
        onClick={() => onToggleTask(task.id)}
        aria-label={isCompletedToday
          ? language === 'en' ? `Mark ${task.title} as open` : `Markeer ${task.title} als open`
          : language === 'en' ? `Mark ${task.title} as completed` : `Markeer ${task.title} als afgerond`}
      >
        {isCompletedToday ? '✓' : ''}
      </button>
      <div className="task-copy">
        <div className="task-meta">
          <span className="pill">{task.cadence === 'daily' ? (language === 'en' ? 'Daily' : 'Dagelijks') : task.cadence === 'weekly' ? (language === 'en' ? 'Weekly' : 'Wekelijks') : language === 'en' ? 'One-off' : 'Eenmalig'}</span>
          {task.cadence === 'weekly' && task.weeklyDay && <span className="pill muted">{getWeekdayLabel(task.weeklyDay, language)}</span>}
          {task.cadence === 'daily' && task.weekdays?.map((weekday) => (
            <span key={weekday} className="pill muted">{getWeekdayLabel(weekday, language)}</span>
          ))}
          <span className="pill muted">{task.durationMinutes} min</span>
          <span className="pill muted">{task.category}</span>
          {task.important && <span className="pill danger">{language === 'en' ? 'Important' : 'Belangrijk'}</span>}
          {task.tracked && <span className="pill success">{language === 'en' ? 'Tracked' : 'Getrackt'}</span>}
          {focusStatusLabel && <span className="pill success">{focusStatusLabel}</span>}
        </div>
        <h3>{task.title}</h3>
        {task.reminderHint && <p>{task.reminderHint}</p>}
        <div className="task-links">
          {showFocusControls && !isCompletedToday && (
            <button type="button" className="mini-button mini-button-strong" onClick={handleTimerAction}>
              {timerButtonLabel}
            </button>
          )}
          <button type="button" className="mini-button" onClick={() => openTaskCalendar(task)}>
            {language === 'en' ? 'Calendar' : 'Agenda'}
          </button>
          <button type="button" className="mini-button" onClick={() => { window.location.href = actions.mailUrl }}>
            Mail
          </button>
        </div>
      </div>
      <button type="button" className="ghost-button" onClick={() => onDeleteTask(task.id)}>
        {language === 'en' ? 'Delete' : 'Verwijder'}
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