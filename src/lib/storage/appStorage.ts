import type {
  AppState,
  DashboardPanelId,
  DashboardWidgetId,
  FocusTimerState,
  MoodEntry,
  ProfileId,
  ProfileState,
  QuickCaptureNode,
  TaskItem,
} from './types'
import { createDefaultIntegrations } from '../tasks/taskIntelligence'

const STORAGE_KEY = 'focus-flow-app-state'

const seedState = (): AppState => ({
  today: new Date().toISOString().slice(0, 10),
  activeProfile: 'private',
  profiles: {
    private: createSeedProfile('private'),
    work: createSeedProfile('work'),
  },
})

export function loadAppState(): AppState {
  if (typeof window === 'undefined') {
    return seedState()
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    const initialState = seedState()
    persist(initialState)
    return initialState
  }

  try {
    const parsed = JSON.parse(stored) as AppState
    const normalized = normalizeState(parsed)

    return {
      ...normalized,
      today: new Date().toISOString().slice(0, 10),
    }
  } catch {
    const fallback = seedState()
    persist(fallback)
    return fallback
  }
}

export function saveMoodEntry(state: AppState, entry: MoodEntry): AppState {
  const activeProfile = getActiveProfile(state)
  const nextEntries = activeProfile.moodEntries.filter((item) => item.date !== entry.date)
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        moodEntries: [entry, ...nextEntries].sort((left, right) => right.date.localeCompare(left.date)),
      },
    },
  }

  persist(nextState)
  return nextState
}

export function toggleTaskCompletion(state: AppState, taskId: string): AppState {
  const activeProfile = getActiveProfile(state)
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        tasks: activeProfile.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completed: !task.completed,
                completionDate: !task.completed ? state.today : undefined,
              }
            : task,
        ),
      },
    },
  }

  persist(nextState)
  return nextState
}

export function addTask(
  state: AppState,
  task: Omit<TaskItem, 'id' | 'completed' | 'createdAt'>,
): AppState {
  const activeProfile = getActiveProfile(state)
  const nextTask: TaskItem = {
    ...task,
    id: createId('task'),
    completed: false,
    completionDate: undefined,
    createdAt: new Date().toISOString(),
  }
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        tasks: [nextTask, ...activeProfile.tasks],
      },
    },
  }

  persist(nextState)
  return nextState
}

export function updateDashboardOrder(state: AppState, nextOrder: DashboardWidgetId[]): AppState {
  const activeProfile = getActiveProfile(state)
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        dashboardOrder: nextOrder,
      },
    },
  }

  persist(nextState)
  return nextState
}

export function updateDashboardPanelOrder(state: AppState, nextOrder: DashboardPanelId[]): AppState {
  const activeProfile = getActiveProfile(state)
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        dashboardPanelOrder: nextOrder,
      },
    },
  }

  persist(nextState)
  return nextState
}

export function startTaskTimer(state: AppState, taskId: string, durationMinutes: number): AppState {
  const activeProfile = getActiveProfile(state)
  const durationSeconds = Math.max(60, Math.round(durationMinutes * 60))
  const startedAt = new Date().toISOString()
  const endsAt = new Date(Date.now() + durationSeconds * 1000).toISOString()
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        activeTimer: {
          taskId,
          status: 'running',
          durationSeconds,
          remainingSeconds: durationSeconds,
          startedAt,
          endsAt,
        },
      },
    },
  }

  persist(nextState)
  return nextState
}

export function pauseTaskTimer(state: AppState): AppState {
  const activeProfile = getActiveProfile(state)
  const timer = activeProfile.activeTimer

  if (!timer || timer.status !== 'running' || !timer.endsAt) {
    return state
  }

  const remainingSeconds = Math.max(0, Math.ceil((Date.parse(timer.endsAt) - Date.now()) / 1000))
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        activeTimer: {
          ...timer,
          status: 'paused',
          remainingSeconds,
          startedAt: undefined,
          endsAt: undefined,
        },
      },
    },
  }

  persist(nextState)
  return nextState
}

export function resumeTaskTimer(state: AppState): AppState {
  const activeProfile = getActiveProfile(state)
  const timer = activeProfile.activeTimer

  if (!timer || timer.status !== 'paused') {
    return state
  }

  const remainingSeconds = Math.max(1, timer.remainingSeconds)
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        activeTimer: {
          ...timer,
          status: 'running',
          remainingSeconds,
          startedAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + remainingSeconds * 1000).toISOString(),
        },
      },
    },
  }

  persist(nextState)
  return nextState
}

export function adjustTaskTimer(state: AppState, minutesDelta: number): AppState {
  const activeProfile = getActiveProfile(state)
  const timer = activeProfile.activeTimer

  if (!timer || minutesDelta === 0) {
    return state
  }

  const deltaSeconds = Math.round(minutesDelta * 60)
  const baseRemainingSeconds = timer.status === 'running' && timer.endsAt
    ? Math.max(0, Math.ceil((Date.parse(timer.endsAt) - Date.now()) / 1000))
    : timer.remainingSeconds
  const remainingSeconds = Math.max(60, baseRemainingSeconds + deltaSeconds)
  const durationSeconds = Math.max(60, timer.durationSeconds + deltaSeconds)
  const nextTimer: FocusTimerState = timer.status === 'running'
    ? {
        ...timer,
        durationSeconds,
        remainingSeconds,
        endsAt: new Date(Date.now() + remainingSeconds * 1000).toISOString(),
      }
    : {
        ...timer,
        durationSeconds,
        remainingSeconds,
      }
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        activeTimer: nextTimer,
      },
    },
  }

  persist(nextState)
  return nextState
}

export function dismissTaskTimer(state: AppState): AppState {
  const activeProfile = getActiveProfile(state)

  if (!activeProfile.activeTimer) {
    return state
  }

  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        activeTimer: undefined,
      },
    },
  }

  persist(nextState)
  return nextState
}

export function completeTaskTimer(state: AppState): AppState {
  const activeProfile = getActiveProfile(state)
  const timer = activeProfile.activeTimer

  if (!timer) {
    return state
  }

  const nextTasks = completeTaskInCollection(activeProfile.tasks, timer.taskId, state.today)
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        tasks: nextTasks,
        activeTimer: {
          ...timer,
          status: 'finished',
          remainingSeconds: 0,
          endsAt: undefined,
          startedAt: undefined,
          completedAt: new Date().toISOString(),
        },
      },
    },
  }

  persist(nextState)
  return nextState
}

export function deleteTask(state: AppState, taskId: string): AppState {
  const activeProfile = getActiveProfile(state)
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        tasks: activeProfile.tasks.filter((task) => task.id !== taskId),
      },
    },
  }

  persist(nextState)
  return nextState
}

export function addCaptureNode(state: AppState): AppState {
  const activeProfile = getActiveProfile(state)
  const nextNode: QuickCaptureNode = {
    id: createId('capture'),
    title: 'Nieuw idee',
    content: '',
    color: 'sand',
    x: 40 + activeProfile.captureNodes.length * 16,
    y: 40 + activeProfile.captureNodes.length * 16,
    width: 220,
    height: 168,
    createdAt: new Date().toISOString(),
  }
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        captureNodes: [...activeProfile.captureNodes, nextNode],
      },
    },
  }

  persist(nextState)
  return nextState
}

export function updateCaptureNode(state: AppState, nodeId: string, patch: Partial<QuickCaptureNode>): AppState {
  const activeProfile = getActiveProfile(state)
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        captureNodes: activeProfile.captureNodes.map((node) =>
          node.id === nodeId ? { ...node, ...patch } : node,
        ),
      },
    },
  }

  persist(nextState)
  return nextState
}

export function deleteCaptureNode(state: AppState, nodeId: string): AppState {
  const activeProfile = getActiveProfile(state)
  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        captureNodes: activeProfile.captureNodes.filter((node) => node.id !== nodeId),
        captureLinks: activeProfile.captureLinks.filter((link) => link.fromId !== nodeId && link.toId !== nodeId),
      },
    },
  }

  persist(nextState)
  return nextState
}

export function toggleCaptureLink(state: AppState, fromId: string, toId: string): AppState {
  const activeProfile = getActiveProfile(state)
  const existing = activeProfile.captureLinks.find(
    (link) =>
      (link.fromId === fromId && link.toId === toId) ||
      (link.fromId === toId && link.toId === fromId),
  )

  const nextLinks = existing
    ? activeProfile.captureLinks.filter((link) => link.id !== existing.id)
    : [...activeProfile.captureLinks, { id: createId('link'), fromId, toId }]

  const nextState = {
    ...state,
    profiles: {
      ...state.profiles,
      [state.activeProfile]: {
        ...activeProfile,
        captureLinks: nextLinks,
      },
    },
  }

  persist(nextState)
  return nextState
}

export function switchProfile(state: AppState, profileId: ProfileId): AppState {
  const nextState = {
    ...state,
    activeProfile: profileId,
  }

  persist(nextState)
  return nextState
}

export function getActiveProfile(state: AppState): ProfileState {
  return state.profiles[state.activeProfile]
}

export function replaceAppState(nextState: AppState): AppState {
  const normalized = normalizeState(nextState)
  persist(normalized)
  return normalized
}

export function serializeAppState(state: AppState) {
  return JSON.stringify(state, null, 2)
}

export function importAppState(payload: string): AppState {
  const parsed = JSON.parse(payload) as AppState
  const normalized = normalizeState(parsed)
  persist(normalized)
  return normalized
}

function persist(state: AppState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function createSeedProfile(profileId: ProfileId): ProfileState {
  if (profileId === 'work') {
    return {
      moodEntries: [],
      tasks: [
        {
          id: 'work-task-1',
          title: 'Belangrijkste 3 werkdoelen kiezen',
          cadence: 'weekly',
          weeklyDay: 'monday',
          category: 'Werkfocus',
          durationMinutes: 30,
          reminderHint: 'Plan dit maandagochtend direct in je agenda',
          completed: false,
          completionDate: undefined,
          important: true,
          integrations: createDefaultIntegrations(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'work-task-2',
          title: 'Inbox en Slack 2x per dag verwerken',
          cadence: 'weekly',
          weeklyDay: 'monday',
          category: 'Communicatie',
          durationMinutes: 20,
          reminderHint: 'Zet twee vaste blokken om context switching te verminderen',
          completed: false,
          completionDate: undefined,
          important: false,
          integrations: createDefaultIntegrations(),
          createdAt: new Date().toISOString(),
        },
      ],
      captureNodes: [
        {
          id: 'work-capture-1',
          title: 'Werkidee',
          content: 'Schets losse werkgedachten en koppel ze aan projecten.',
          color: 'sky',
          x: 48,
          y: 56,
          width: 220,
          height: 160,
          createdAt: new Date().toISOString(),
        },
      ],
      captureLinks: [],
      dashboardOrder: createDefaultDashboardOrder('work'),
      dashboardPanelOrder: createDefaultDashboardPanelOrder('work'),
      activeTimer: undefined,
    }
  }

  return {
    moodEntries: [],
    tasks: [
      {
        id: 'private-task-1',
        title: 'Weekplanning nalopen',
        cadence: 'weekly',
        weeklyDay: 'monday',
        category: 'Structuur',
        durationMinutes: 25,
        reminderHint: 'Zet een terugkerend agenda-item op maandag 09:00',
        completed: false,
        completionDate: undefined,
        important: true,
        integrations: createDefaultIntegrations(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'private-task-2',
        title: 'Waterfles vullen en klaarzetten',
        cadence: 'once',
        weeklyDay: undefined,
        category: 'Zelfzorg',
        durationMinutes: 10,
        reminderHint: 'Maak een korte telefoonreminder voor vanavond',
        completed: true,
        completionDate: new Date().toISOString().slice(0, 10),
        important: false,
        integrations: createDefaultIntegrations(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'private-task-3',
        title: '10 minuten administratie',
        cadence: 'weekly',
        weeklyDay: 'wednesday',
        category: 'Huishouden',
        durationMinutes: 10,
        reminderHint: 'Plan in je kalender als blokje na het eten',
        completed: false,
        completionDate: undefined,
        important: false,
        integrations: createDefaultIntegrations(),
        createdAt: new Date().toISOString(),
      },
    ],
    captureNodes: [
      {
        id: 'private-capture-1',
        title: 'Braindump',
        content: 'Losse gedachte die je later kunt omzetten naar een taak.',
        color: 'sand',
        x: 36,
        y: 48,
        width: 220,
        height: 164,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'private-capture-2',
        title: 'Volgende stap',
        content: 'Koppel deze kaart aan de braindump of zet hem om naar een taak.',
        color: 'mint',
        x: 340,
        y: 168,
        width: 220,
        height: 164,
        createdAt: new Date().toISOString(),
      },
    ],
    captureLinks: [
      {
        id: 'private-link-1',
        fromId: 'private-capture-1',
        toId: 'private-capture-2',
      },
    ],
    dashboardOrder: createDefaultDashboardOrder('private'),
    dashboardPanelOrder: createDefaultDashboardPanelOrder('private'),
    activeTimer: undefined,
  }
}

function normalizeState(state: AppState): AppState {
  if ('profiles' in state && state.profiles.private && state.profiles.work) {
    const now = Date.now()
    return {
      today: state.today,
      activeProfile: state.activeProfile ?? 'private',
      profiles: {
        private: normalizeProfile(state.profiles.private, 'private', state.today, now),
        work: normalizeProfile(state.profiles.work, 'work', state.today, now),
      },
    }
  }

  return seedState()
}

function normalizeProfile(profile: ProfileState, profileId: ProfileId, today: string, now: number): ProfileState {
  const tasks = Array.isArray(profile.tasks)
    ? profile.tasks.map((task) => ({
        ...task,
        weeklyDay: task.weeklyDay,
        durationMinutes: Math.max(5, Number(task.durationMinutes) || 25),
        completionDate: task.completionDate,
        important: task.important ?? false,
        integrations: task.integrations ?? createDefaultIntegrations(),
        createdAt: task.createdAt ?? new Date().toISOString(),
      }))
    : []
  const normalizedTimer = normalizeTimer(profile.activeTimer, tasks, today, now)

  return {
    moodEntries: Array.isArray(profile.moodEntries) ? profile.moodEntries : [],
    tasks: normalizedTimer.tasks,
    captureNodes: Array.isArray(profile.captureNodes)
      ? profile.captureNodes.map((node) => ({
          ...node,
          color: node.color ?? 'sand',
          width: node.width ?? 220,
          height: node.height ?? 168,
          createdAt: node.createdAt ?? new Date().toISOString(),
        }))
      : [],
    captureLinks: Array.isArray(profile.captureLinks) ? profile.captureLinks : [],
    dashboardOrder: normalizeDashboardOrder(profile.dashboardOrder, profileId),
    dashboardPanelOrder: normalizeDashboardPanelOrder(profile.dashboardPanelOrder, profileId),
    activeTimer: normalizedTimer.activeTimer,
  }
}

function createDefaultDashboardOrder(profileId: ProfileId): DashboardWidgetId[] {
  return profileId === 'private'
    ? ['focus', 'completed', 'important', 'greenDays', 'weekly', 'ideas', 'audio']
    : ['focus', 'completed', 'important', 'weekly', 'ideas']
}

function normalizeDashboardOrder(order: DashboardWidgetId[] | undefined, profileId: ProfileId): DashboardWidgetId[] {
  const fallback = createDefaultDashboardOrder(profileId)

  if (!Array.isArray(order)) {
    return fallback
  }

  const unique = order.filter((item, index) => fallback.includes(item) && order.indexOf(item) === index)
  const missing = fallback.filter((item) => !unique.includes(item))
  return [...unique, ...missing]
}

function createDefaultDashboardPanelOrder(profileId: ProfileId): DashboardPanelId[] {
  return profileId === 'private'
    ? ['mood', 'overview', 'tasks', 'audio']
    : ['overview', 'tasks']
}

function normalizeDashboardPanelOrder(order: DashboardPanelId[] | undefined, profileId: ProfileId): DashboardPanelId[] {
  const fallback = createDefaultDashboardPanelOrder(profileId)

  if (!Array.isArray(order)) {
    return fallback
  }

  const unique = order.filter((item, index) => fallback.includes(item) && order.indexOf(item) === index)
  const missing = fallback.filter((item) => !unique.includes(item))
  return [...unique, ...missing]
}

function normalizeTimer(
  timer: FocusTimerState | undefined,
  tasks: TaskItem[],
  today: string,
  now: number,
): { tasks: TaskItem[]; activeTimer?: FocusTimerState } {
  if (!timer || !tasks.some((task) => task.id === timer.taskId)) {
    return { tasks, activeTimer: undefined }
  }

  const durationSeconds = Math.max(5 * 60, Number(timer.durationSeconds) || 25 * 60)

  if (timer.status === 'running') {
    const remainingSeconds = timer.endsAt
      ? Math.max(0, Math.ceil((Date.parse(timer.endsAt) - now) / 1000))
      : Math.max(1, Number(timer.remainingSeconds) || durationSeconds)

    if (remainingSeconds === 0) {
      return {
        tasks: completeTaskInCollection(tasks, timer.taskId, today),
        activeTimer: {
          ...timer,
          status: 'finished',
          durationSeconds,
          remainingSeconds: 0,
          startedAt: undefined,
          endsAt: undefined,
          completedAt: timer.completedAt ?? new Date(now).toISOString(),
        },
      }
    }

    return {
      tasks,
      activeTimer: {
        ...timer,
        status: 'running',
        durationSeconds,
        remainingSeconds,
        endsAt: timer.endsAt ?? new Date(now + remainingSeconds * 1000).toISOString(),
      },
    }
  }

  if (timer.status === 'finished') {
    return {
      tasks: completeTaskInCollection(tasks, timer.taskId, today),
      activeTimer: {
        ...timer,
        status: 'finished',
        durationSeconds,
        remainingSeconds: 0,
        startedAt: undefined,
        endsAt: undefined,
        completedAt: timer.completedAt ?? new Date(now).toISOString(),
      },
    }
  }

  return {
    tasks,
    activeTimer: {
      ...timer,
      status: 'paused',
      durationSeconds,
      remainingSeconds: Math.max(1, Number(timer.remainingSeconds) || durationSeconds),
      startedAt: undefined,
      endsAt: undefined,
    },
  }
}

function completeTaskInCollection(tasks: TaskItem[], taskId: string, today: string): TaskItem[] {
  return tasks.map((task) =>
    task.id === taskId && !task.completed
      ? {
          ...task,
          completed: true,
          completionDate: today,
        }
      : task,
  )
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
