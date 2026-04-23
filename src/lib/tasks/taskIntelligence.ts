import type { QuickCaptureNode, TaskItem, TaskIntegrations, Weekday } from '../storage/types'

export const DEFAULT_TASK_DURATION_MINUTES = 25

const weekdayPattern = /elke\s+(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)/i
const importantPattern = /\b(belangrijk|urgent|spoed|prioriteit|must)\b/i
const mailPattern = /\b(mail|email|e-mail)\b/i
const tomorrowPattern = /\bmorgen\b/i

export interface ParsedTaskDraft {
  title: string
  category: string
  cadence: 'once' | 'weekly'
  weeklyDay?: Weekday
  reminderHint: string
  important: boolean
}

export interface TaskActions {
  calendarUrl: string
  mailUrl: string
  alarmText: string
}

type CalendarTaskDetails = Pick<TaskItem, 'title' | 'category' | 'reminderHint'>

export function parseTaskDraft(input: string, fallbackCategory: string): ParsedTaskDraft {
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
    title: normalizedTitle || compactInput || 'Nieuwe taak',
    category: isMail ? 'Communicatie' : fallbackCategory || 'Algemeen',
    cadence: isWeekly ? 'weekly' : 'once',
    weeklyDay: detectWeekday(compactInput) ?? undefined,
    reminderHint: buildReminderHint(compactInput, isWeekly, mentionsTomorrow, isMail),
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

export function isTaskCompleted(task: Pick<TaskItem, 'cadence' | 'completed' | 'completionDate'>, today: string) {
  if (!task.completed) {
    return false
  }

  if (task.cadence === 'once') {
    return true
  }

  if (!task.completionDate) {
    return false
  }

  return getWeekKey(task.completionDate) === getWeekKey(today)
}

export function getWeekdayLabel(weekday?: Weekday) {
  const labels: Record<Weekday, string> = {
    monday: 'Maandag',
    tuesday: 'Dinsdag',
    wednesday: 'Woensdag',
    thursday: 'Donderdag',
    friday: 'Vrijdag',
    saturday: 'Zaterdag',
    sunday: 'Zondag',
  }

  return weekday ? labels[weekday] : 'Wekelijks'
}

export function createDefaultIntegrations(): TaskIntegrations {
  return {
    calendar: false,
    alarm: false,
    mail: false,
  }
}

function detectWeekday(input: string): Weekday | null {
  const normalized = input.toLowerCase()
  const map: Array<[Weekday, string]> = [
    ['monday', 'maandag'],
    ['tuesday', 'dinsdag'],
    ['wednesday', 'woensdag'],
    ['thursday', 'donderdag'],
    ['friday', 'vrijdag'],
    ['saturday', 'zaterdag'],
    ['sunday', 'zondag'],
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

function buildReminderHint(input: string, isWeekly: boolean, mentionsTomorrow: boolean, isMail: boolean) {
  if (isWeekly) {
    const day = input.match(weekdayPattern)?.[1] ?? 'je vaste dag'
    return `Zet dit als terugkerend moment in je agenda op ${day}.`
  }

  if (mentionsTomorrow) {
    return 'Maak hiervoor een reminder voor morgen in je agenda of wekker.'
  }

  if (isMail) {
    return 'Handig om dit direct als maildraft of follow-up in te plannen.'
  }

  return 'Voeg dit desgewenst toe aan je agenda, mail of wekker.'
}

function prefersIPhoneCalendar() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /iPhone|iPod/i.test(navigator.userAgent)
}