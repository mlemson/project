import type { AppLanguage, QuickCaptureNode, TaskItem, TaskIntegrations, Weekday } from '../storage/types'

export const DEFAULT_TASK_DURATION_MINUTES = 5

const weekdayPattern = /(?:elke|every)\s+(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
const importantPattern = /\b(belangrijk|urgent|spoed|prioriteit|must|important|priority)\b/i
const mailPattern = /\b(mail|email|e-mail)\b/i
const tomorrowPattern = /\b(morgen|tomorrow)\b/i

export interface ParsedTaskDraft {
  title: string
  category: string
  cadence: 'once' | 'weekly' | 'daily'
  weeklyDay?: Weekday
  weekdays?: Weekday[]
  reminderHint: string
  important: boolean
}

export interface TaskActions {
  calendarUrl: string
  mailUrl: string
  alarmText: string
}

type CalendarTaskDetails = Pick<TaskItem, 'title' | 'category' | 'reminderHint'>

export function parseTaskDraft(input: string, fallbackCategory: string, language: AppLanguage = 'nl'): ParsedTaskDraft {
  const compactInput = input.trim().replace(/\s+/g, ' ')
  const isWeekly = weekdayPattern.test(compactInput)
  const isImportant = importantPattern.test(compactInput)
  const isMail = mailPattern.test(compactInput)
  const mentionsTomorrow = tomorrowPattern.test(compactInput)

  const normalizedTitle = compactInput
    .replace(weekdayPattern, '')
    .replace(importantPattern, '')
    .replace(/^\s*idea:?/i, '')
    .replace(/^\s*taak:?/i, '')
    .trim()

  return {
    title: normalizedTitle || compactInput || (language === 'en' ? 'New task' : 'Nieuwe taak'),
    category: isMail ? (language === 'en' ? 'Communication' : 'Communicatie') : fallbackCategory || (language === 'en' ? 'General' : 'Algemeen'),
    cadence: isWeekly ? 'weekly' : 'once',
    weeklyDay: detectWeekday(compactInput) ?? undefined,
    weekdays: isWeekly ? [detectWeekday(compactInput) ?? 'monday'] : undefined,
    reminderHint: buildReminderHint(compactInput, isWeekly, mentionsTomorrow, isMail, language),
    important: isImportant,
  }
}

export function buildTaskActions(task: CalendarTaskDetails): TaskActions {
  const details = `${task.category} - ${task.reminderHint}`
  const calendarUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(task.title)}&body=${encodeURIComponent(details)}`
  const mailUrl = `mailto:?subject=${encodeURIComponent(task.title)}&body=${encodeURIComponent(`${task.title}\n\n${task.reminderHint}`)}`

  return {
    calendarUrl,
    mailUrl,
    alarmText: `${task.title} - ${task.reminderHint}`,
  }
}

export function openTaskCalendar(task: CalendarTaskDetails) {
  if (typeof window === 'undefined') {
    return
  }

  if (prefersIPhoneCalendar()) {
    window.location.href = 'calshow:'
    return
  }

  const actions = buildTaskActions(task)
  window.open(actions.calendarUrl, '_blank', 'noopener,noreferrer')
}

export function taskDraftFromCapture(node: QuickCaptureNode): ParsedTaskDraft {
  return parseTaskDraft(`${node.title} ${node.content}`.trim(), 'Inbox')
}

export function isTaskCompleted(
  task: Pick<TaskItem, 'cadence' | 'completed' | 'completionDate' | 'completionHistory'>,
  today: string,
) {
  if (task.cadence === 'once') {
    return task.completed
  }

  const history = Array.isArray(task.completionHistory) ? task.completionHistory : []

  if (task.cadence === 'daily') {
    return history.includes(today)
  }

  if (history.some((date) => getWeekKey(date) === getWeekKey(today))) {
    return true
  }

  if (!task.completed || !task.completionDate) {
    return false
  }

  return getWeekKey(task.completionDate) === getWeekKey(today)
}

export function isTaskVisibleToday(
  task: Pick<TaskItem, 'cadence' | 'completed' | 'completionDate' | 'completionHistory' | 'weekdays' | 'weeklyDay'>,
  today: string,
) {
  if (task.cadence === 'daily') {
    const weekday = getWeekdayFromDate(today)
    return (task.weekdays ?? []).includes(weekday)
  }

  return !isTaskCompleted(task, today)
}

export function wasTaskCompletedOnDate(task: Pick<TaskItem, 'completionHistory' | 'completionDate' | 'completed' | 'cadence'>, date: string) {
  if (Array.isArray(task.completionHistory) && task.completionHistory.includes(date)) {
    return true
  }

  return task.completed && task.completionDate === date && task.cadence === 'once'
}

export function getWeekdayLabel(weekday: Weekday | undefined, language: AppLanguage = 'nl') {
  const labels: Record<Weekday, string> = {
    monday: language === 'en' ? 'Monday' : 'Maandag',
    tuesday: language === 'en' ? 'Tuesday' : 'Dinsdag',
    wednesday: language === 'en' ? 'Wednesday' : 'Woensdag',
    thursday: language === 'en' ? 'Thursday' : 'Donderdag',
    friday: language === 'en' ? 'Friday' : 'Vrijdag',
    saturday: language === 'en' ? 'Saturday' : 'Zaterdag',
    sunday: language === 'en' ? 'Sunday' : 'Zondag',
  }

  return weekday ? labels[weekday] : language === 'en' ? 'Weekly' : 'Wekelijks'
}

export function createDefaultIntegrations(): TaskIntegrations {
  return {
    calendar: false,
    mail: false,
  }
}

function detectWeekday(input: string): Weekday | null {
  const normalized = input.toLowerCase()
  const map: Array<[Weekday, string]> = [
    ['monday', 'maandag'],
    ['monday', 'monday'],
    ['tuesday', 'dinsdag'],
    ['tuesday', 'tuesday'],
    ['wednesday', 'woensdag'],
    ['wednesday', 'wednesday'],
    ['thursday', 'donderdag'],
    ['thursday', 'thursday'],
    ['friday', 'vrijdag'],
    ['friday', 'friday'],
    ['saturday', 'zaterdag'],
    ['saturday', 'saturday'],
    ['sunday', 'zondag'],
    ['sunday', 'sunday'],
  ]

  const found = map.find(([, label]) => normalized.includes(label))
  return found ? found[0] : null
}

function getWeekKey(date: string) {
  const value = new Date(`${date}T12:00:00`)
  const day = (value.getDay() + 6) % 7
  value.setDate(value.getDate() - day + 3)
  const firstThursday = new Date(value.getFullYear(), 0, 4)
  const firstDay = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3)
  const diff = value.getTime() - firstThursday.getTime()
  const week = 1 + Math.round(diff / 604800000)

  return `${value.getFullYear()}-${String(week).padStart(2, '0')}`
}

function buildReminderHint(input: string, isWeekly: boolean, mentionsTomorrow: boolean, isMail: boolean, language: AppLanguage) {
  if (isWeekly) {
    const day = input.match(weekdayPattern)?.[1] ?? 'je vaste dag'
    return language === 'en'
      ? `Put this on your calendar as a recurring moment on ${day}.`
      : `Zet dit als terugkerend moment in je agenda op ${day}.`
  }

  if (mentionsTomorrow) {
    return language === 'en'
      ? 'Create a reminder for tomorrow in your calendar or mail flow.'
      : 'Maak hiervoor een reminder voor morgen in je agenda of mailflow.'
  }

  if (isMail) {
    return language === 'en'
      ? 'Useful to turn this into a draft email or follow-up right away.'
      : 'Handig om dit direct als maildraft of follow-up in te plannen.'
  }

  return language === 'en'
    ? 'Optionally add this to your calendar or draft mail.'
    : 'Voeg dit desgewenst toe aan je agenda of mail.'
}

function getWeekdayFromDate(date: string): Weekday {
  const day = new Date(`${date}T12:00:00`).getDay()
  const map: Record<number, Weekday> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }

  return map[day]
}

function prefersIPhoneCalendar() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /iPhone|iPod/i.test(navigator.userAgent)
}