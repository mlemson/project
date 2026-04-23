export type MoodColor = 'red' | 'orange' | 'yellow' | 'lime' | 'green'

export type AppLanguage = 'nl' | 'en'
export type OptionalFeatureId = 'mood' | 'audio'
export type AppSection = 'dashboard' | 'mood' | 'tasks' | 'stats' | 'capture' | 'audio' | 'social' | 'add' | 'settings'

export type ProfileId = 'private' | 'work'
export type DashboardWidgetId = 'focus' | 'completed' | 'weekly' | 'greenDays' | 'important' | 'ideas' | 'audio'
export type DashboardPanelId = 'mood' | 'overview' | 'tasks' | 'audio'

export type CaptureColor = 'sand' | 'coral' | 'sky' | 'mint' | 'lavender'
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface TaskIntegrations {
  calendar: boolean
  mail: boolean
}

export interface ProfileSettings {
  taskCategories: string[]
  enabledOptionalFeatures: OptionalFeatureId[]
}

export interface AppSettings {
  language: AppLanguage
  profiles: Record<ProfileId, ProfileSettings>
}

export interface MoodEntry {
  date: string
  color: MoodColor
  label: string
  note: string
}

export interface TaskItem {
  id: string
  title: string
  cadence: 'once' | 'weekly' | 'daily'
  weeklyDay?: Weekday
  weekdays?: Weekday[]
  category: string
  durationMinutes: number
  reminderHint: string
  completed: boolean
  completionDate?: string
  completionHistory: string[]
  tracked: boolean
  important: boolean
  integrations: TaskIntegrations
  createdAt: string
}

export interface FocusTimerState {
  taskId: string
  status: 'running' | 'paused' | 'finished'
  durationSeconds: number
  remainingSeconds: number
  startedAt?: string
  endsAt?: string
  completedAt?: string
}

export interface QuickCaptureNode {
  id: string
  title: string
  content: string
  color: CaptureColor
  x: number
  y: number
  width: number
  height: number
  createdAt: string
}

export interface QuickCaptureLink {
  id: string
  fromId: string
  toId: string
}

export interface ProfileState {
  moodEntries: MoodEntry[]
  tasks: TaskItem[]
  captureNodes: QuickCaptureNode[]
  captureLinks: QuickCaptureLink[]
  dashboardOrder: DashboardWidgetId[]
  dashboardPanelOrder: DashboardPanelId[]
  activeTimer?: FocusTimerState
}

export interface MindfulnessTrack {
  id: string
  name: string
  addedAt: string
  sizeLabel: string
  url: string
}

export interface AppState {
  today: string
  activeProfile: ProfileId
  settings: AppSettings
  profiles: Record<ProfileId, ProfileState>
}
