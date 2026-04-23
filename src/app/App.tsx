import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AudioLibrary } from '../features/audio/AudioLibrary'
import { QuickCaptureBoard } from '../features/capture/QuickCaptureBoard'
import { DashboardScreen } from '../features/dashboard/DashboardScreen'
import { MoodCheckCard } from '../features/mood/MoodCheckCard'
import { SocialScreen } from '../features/social/SocialScreen'
import { StatsScreen } from '../features/stats/StatsScreen'
import { FocusTimerDock, FocusTimerPanel } from '../features/tasks/FocusTimerPanel'
import { TaskBoard } from '../features/tasks/TaskBoard'
import {
  addCaptureNode,
  addTask,
  adjustTaskTimer,
  completeTaskTimer,
  deleteTask,
  dismissTaskTimer,
  deleteCaptureNode,
  getActiveProfile,
  replaceAppState,
  loadAppState,
  pauseTaskTimer,
  saveMoodEntry,
  resumeTaskTimer,
  startTaskTimer,
  switchProfile,
  updateDashboardPanelOrder,
  toggleCaptureLink,
  toggleTaskCompletion,
  updateCaptureNode,
} from '../lib/storage/appStorage'
import {
  deleteMindfulnessTrack,
  loadMindfulnessTracks,
  renameMindfulnessTrack,
  saveMindfulnessTrack,
} from '../lib/storage/audioStorage'
import { downloadAppState, importAppStateFile } from '../lib/transfer/appTransfer'
import { isTaskCompleted } from '../lib/tasks/taskIntelligence'
import type { AppSection, AppState, DashboardPanelId, MindfulnessTrack, ProfileId, TaskItem } from '../lib/storage/types'

const allSections: Array<{ id: AppSection; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'mood', label: 'Check-in' },
  { id: 'tasks', label: 'Taken' },
  { id: 'stats', label: 'Statistieken' },
  { id: 'capture', label: 'Ideeen' },
  { id: 'audio', label: 'Mindfulness' },
  { id: 'social', label: 'Sociaal' },
]

const profiles: Array<{ id: ProfileId; label: string }> = [
  { id: 'private', label: 'Prive' },
  { id: 'work', label: 'Werk' },
]

export function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard')
  const [state, setState] = useState<AppState>(() => loadAppState())
  const [tracks, setTracks] = useState<MindfulnessTrack[]>([])
  const [audioError, setAudioError] = useState<string | null>(null)
  const [transferMessage, setTransferMessage] = useState<string | null>(null)
  const [draggedPanelId, setDraggedPanelId] = useState<DashboardPanelId | null>(null)
  const [isFocusOverlayOpen, setIsFocusOverlayOpen] = useState(false)
  const [isFocusDockVisible, setIsFocusDockVisible] = useState(false)

  const profileState = useMemo(() => getActiveProfile(state), [state])
  const isPrivateProfile = state.activeProfile === 'private'
  const activeTimer = profileState.activeTimer
  const activeTimerTask = activeTimer ? profileState.tasks.find((task) => task.id === activeTimer.taskId) : undefined
  const sections = useMemo(
    () => allSections.filter((section) => (isPrivateProfile ? true : section.id !== 'mood' && section.id !== 'audio')),
    [isPrivateProfile],
  )

  const todayMood = useMemo(
    () => profileState.moodEntries.find((entry) => entry.date === state.today),
    [profileState.moodEntries, state.today],
  )

  const completedToday = profileState.tasks.filter((task) => isTaskCompleted(task, state.today)).length
  const importantOpenTasks = profileState.tasks.filter((task) => task.important && !isTaskCompleted(task, state.today)).length

  useEffect(() => {
    if (!isPrivateProfile && activeSection === 'mood') {
      setActiveSection('dashboard')
    }
  }, [activeSection, isPrivateProfile])

  useEffect(() => {
    let isActive = true

    loadMindfulnessTracks()
      .then((items) => {
        if (isActive) {
          setTracks(items)
        }
      })
      .catch(() => {
        if (isActive) {
          setAudioError('Mindfulness-audio kon niet geladen worden in deze browser.')
        }
      })

    return () => {
      isActive = false
      tracks.forEach((track) => URL.revokeObjectURL(track.url))
    }
  }, [])

  useEffect(() => {
    if (!activeTimer || activeTimer.status !== 'running' || !activeTimer.endsAt) {
      return
    }

    const remainingMs = Date.parse(activeTimer.endsAt) - Date.now()

    if (remainingMs <= 0) {
      setState((current) => completeTaskTimer(current))
      return
    }

    const timeoutId = window.setTimeout(() => {
      setState((current) => completeTaskTimer(current))
    }, remainingMs + 50)

    return () => window.clearTimeout(timeoutId)
  }, [activeTimer])

  useEffect(() => {
    if (activeTimer?.status === 'finished') {
      setIsFocusOverlayOpen(true)
      setIsFocusDockVisible(false)
    }
  }, [activeTimer?.completedAt, activeTimer?.status])

  const refreshTracks = async () => {
    const items = await loadMindfulnessTracks()
    setTracks((current) => {
      current.forEach((track) => URL.revokeObjectURL(track.url))
      return items
    })
  }

  const handleAudioUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    try {
      for (const file of Array.from(files)) {
        await saveMindfulnessTrack(file)
      }

      setAudioError(null)
      await refreshTracks()
    } catch {
      setAudioError('Opslaan van audio lukte niet. Probeer een mp3 of ander audiobestand.')
    }
  }

  const handleAudioDelete = async (trackId: string) => {
    await deleteMindfulnessTrack(trackId)
    await refreshTracks()
  }

  const handleTaskAdd = (task: Omit<TaskItem, 'id' | 'completed' | 'createdAt' | 'completionDate'>) => {
    setState((current) => addTask(current, task))
    setActiveSection('tasks')
  }

  const handleAudioRename = async (trackId: string, nextName: string) => {
    await renameMindfulnessTrack(trackId, nextName)
    await refreshTracks()
  }

  const handleExport = () => {
    downloadAppState(state)
    setTransferMessage('Exportbestand gedownload.')
  }

  const handleImport = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    try {
      const nextState = await importAppStateFile(files[0])
      setState(replaceAppState(nextState))
      setTransferMessage('Import gelukt.')
    } catch {
      setTransferMessage('Import mislukt. Controleer of je een geldig exportbestand hebt gekozen.')
    }
  }

  const handleStartFocus = (taskId: string, durationMinutes: number) => {
    setState((current) => startTaskTimer(current, taskId, durationMinutes))
    setIsFocusOverlayOpen(true)
    setIsFocusDockVisible(false)
  }

  const handleResumeFocus = () => {
    setState((current) => resumeTaskTimer(current))
    setIsFocusOverlayOpen(true)
    setIsFocusDockVisible(false)
  }

  const handlePauseFocus = () => {
    setState((current) => pauseTaskTimer(current))
    setIsFocusOverlayOpen(false)
    setIsFocusDockVisible(false)
  }

  const handleMinimizeFocus = () => {
    setIsFocusOverlayOpen(false)
    setIsFocusDockVisible(true)
  }

  const handleRestoreFocus = () => {
    setIsFocusOverlayOpen(true)
    setIsFocusDockVisible(false)
  }

  const handleCloseFocus = () => {
    if (activeTimer?.status === 'finished') {
      setState((current) => dismissTaskTimer(current))
      setIsFocusOverlayOpen(false)
      setIsFocusDockVisible(false)
      return
    }

    if (activeTimer?.status === 'running') {
      setState((current) => pauseTaskTimer(current))
    }

    setIsFocusOverlayOpen(false)
    setIsFocusDockVisible(false)
  }

  const handleToggleTask = (taskId: string) => {
    if (activeTimer?.taskId === taskId) {
      setIsFocusOverlayOpen(false)
      setIsFocusDockVisible(false)
    }

    setState((current) => toggleTaskCompletion(current, taskId))
  }

  const handleCompleteFocus = () => {
    setState((current) => completeTaskTimer(current))
    setIsFocusOverlayOpen(true)
    setIsFocusDockVisible(false)
  }

  const dashboardPanels = useMemo(() => {
    const availablePanels: Array<{ id: DashboardPanelId; node: ReactNode }> = []

    if (isPrivateProfile) {
      availablePanels.push({
        id: 'mood',
        node: (
          <MoodCheckCard
            entries={profileState.moodEntries}
            today={state.today}
            onSave={(entry) => setState((current) => saveMoodEntry(current, entry))}
          />
        ),
      })
    }

    availablePanels.push({
      id: 'overview',
      node: (
        <DashboardScreen
          moodEntries={profileState.moodEntries}
          tasks={profileState.tasks}
          today={state.today}
          profileLabel={state.activeProfile === 'private' ? 'Prive' : 'Werk'}
          trackCount={tracks.length}
          quickCaptureCount={profileState.captureNodes.length}
        />
      ),
    })

    availablePanels.push({
      id: 'tasks',
      node: (
        <TaskBoard
          tasks={profileState.tasks}
          today={state.today}
          onToggleTask={(taskId) => setState((current) => toggleTaskCompletion(current, taskId))}
          onDeleteTask={(taskId) => setState((current) => deleteTask(current, taskId))}
          onAddTask={handleTaskAdd}
          activeTimer={activeTimer}
          onStartTimer={handleStartFocus}
          onPauseTimer={handlePauseFocus}
          onResumeTimer={handleResumeFocus}
          profileLabel={state.activeProfile === 'private' ? 'Prive' : 'Werk'}
        />
      ),
    })

    if (isPrivateProfile) {
      availablePanels.push({
        id: 'audio',
        node: (
          <AudioLibrary
            tracks={tracks}
            error={audioError}
            onUpload={handleAudioUpload}
            onDelete={handleAudioDelete}
            onRename={handleAudioRename}
          />
        ),
      })
    }

    const panelMap = new Map(availablePanels.map((panel) => [panel.id, panel]))
    const orderedIds = [
      ...profileState.dashboardPanelOrder.filter((panelId) => panelMap.has(panelId)),
      ...availablePanels.map((panel) => panel.id).filter((panelId) => !profileState.dashboardPanelOrder.includes(panelId)),
    ]

    return orderedIds.map((panelId) => panelMap.get(panelId)).filter(Boolean) as typeof availablePanels
  }, [
    activeTimer,
    audioError,
    isPrivateProfile,
    profileState.captureNodes.length,
    profileState.dashboardPanelOrder,
    profileState.moodEntries,
    profileState.tasks,
    state.activeProfile,
    state.today,
    tracks,
  ])

  const moveDashboardPanel = (targetId: DashboardPanelId) => {
    if (!draggedPanelId || draggedPanelId === targetId) {
      return
    }

    const currentOrder = dashboardPanels.map((panel) => panel.id)
    const draggedIndex = currentOrder.indexOf(draggedPanelId)
    const targetIndex = currentOrder.indexOf(targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      return
    }

    const nextOrder = [...currentOrder]
    const [panelId] = nextOrder.splice(draggedIndex, 1)
    nextOrder.splice(targetIndex, 0, panelId)
    setState((current) => updateDashboardPanelOrder(current, nextOrder))
    setDraggedPanelId(null)
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">Focus Flow</p>
          <div className="profile-switch" aria-label="Profiel wisselen">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={profile.id === state.activeProfile ? 'profile-pill active' : 'profile-pill'}
                onClick={() => setState((current) => switchProfile(current, profile.id))}
              >
                {profile.label}
              </button>
            ))}
          </div>
          <h1>Planning en voortgang in een lokaal dashboard.</h1>
          <p className="hero-copy">
            {isPrivateProfile
              ? 'Beheer je check-ins, taken, losse ideeën en audio lokaal in je privémodus.'
              : 'Gebruik de werkmodus voor taken, quick capture en opvolging richting agenda, mail of herinneringen.'}
          </p>
          <div className="transfer-row">
            <button type="button" className="secondary-button" onClick={handleExport}>Export</button>
            <label className="secondary-button import-button">
              Import
              <input type="file" accept="application/json" onChange={(event) => void handleImport(event.target.files)} />
            </label>
          </div>
          {transferMessage && <p className="helper-copy">{transferMessage}</p>}
        </div>
        <div className="hero-stats">
          {isPrivateProfile && (
            <div>
              <span className="stat-label">Check-in vandaag</span>
              <strong>{todayMood ? todayMood.label : 'Nog niet gedaan'}</strong>
            </div>
          )}
          <div>
            <span className="stat-label">Taken afgerond</span>
            <strong>{completedToday}</strong>
          </div>
          <div>
            <span className="stat-label">Belangrijke open taken</span>
            <strong>{importantOpenTasks}</strong>
          </div>
          {isPrivateProfile && (
            <div>
              <span className="stat-label">Mindfulness tracks</span>
              <strong>{tracks.length}</strong>
            </div>
          )}
          <div>
            <span className="stat-label">Ideeen</span>
            <strong>{profileState.captureNodes.length}</strong>
          </div>
        </div>
      </header>

      <nav className="tab-bar" aria-label="Hoofdnavigatie">
        {sections.map((section) => (
          <button
            key={section.id}
            className={section.id === activeSection ? 'tab active' : 'tab'}
            onClick={() => setActiveSection(section.id)}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </nav>

      <main className={activeSection === 'dashboard' ? 'content-grid dashboard-mode' : 'content-grid'}>
        {activeSection === 'dashboard' && (
          <div className="dashboard-panel-grid">
            {dashboardPanels.map((panel) => (
              <div
                key={panel.id}
                className={draggedPanelId === panel.id ? 'dashboard-panel-shell dragging' : 'dashboard-panel-shell'}
                data-panel={panel.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveDashboardPanel(panel.id)}
              >
                <button
                  type="button"
                  className="panel-drag-handle"
                  draggable
                  aria-label="Versleep dashboardmodule"
                  onDragStart={() => setDraggedPanelId(panel.id)}
                  onDragEnd={() => setDraggedPanelId(null)}
                >
                  <span className="drag-handle-dot" />
                  <span className="drag-handle-dot" />
                  <span className="drag-handle-dot" />
                  <span className="drag-handle-dot" />
                  <span className="drag-handle-dot" />
                  <span className="drag-handle-dot" />
                </button>
                {panel.node}
              </div>
            ))}
          </div>
        )}

        {isPrivateProfile && activeSection === 'mood' && (
          <MoodCheckCard
            entries={profileState.moodEntries}
            today={state.today}
            onSave={(entry) => setState((current) => saveMoodEntry(current, entry))}
          />
        )}

        {activeSection === 'tasks' && (
          <TaskBoard
            tasks={profileState.tasks}
            today={state.today}
            onToggleTask={handleToggleTask}
            onDeleteTask={(taskId) => setState((current) => deleteTask(current, taskId))}
            onAddTask={handleTaskAdd}
            activeTimer={activeTimer}
            onStartTimer={handleStartFocus}
            onPauseTimer={handlePauseFocus}
            onResumeTimer={handleResumeFocus}
            profileLabel={state.activeProfile === 'private' ? 'Prive' : 'Werk'}
          />
        )}

        {activeSection === 'stats' && (
          <StatsScreen
            profileId={state.activeProfile}
            moodEntries={profileState.moodEntries}
            tasks={profileState.tasks}
            today={state.today}
          />
        )}

        {activeSection === 'capture' && (
          <QuickCaptureBoard
            nodes={profileState.captureNodes}
            links={profileState.captureLinks}
            onAddNode={() => setState((current) => addCaptureNode(current))}
            onUpdateNode={(nodeId, patch) => setState((current) => updateCaptureNode(current, nodeId, patch))}
            onDeleteNode={(nodeId) => setState((current) => deleteCaptureNode(current, nodeId))}
            onToggleLink={(fromId, toId) => setState((current) => toggleCaptureLink(current, fromId, toId))}
            onConvertToTask={handleTaskAdd}
          />
        )}

        {activeSection === 'audio' && (
          isPrivateProfile && (
          <AudioLibrary
            tracks={tracks}
            error={audioError}
            onUpload={handleAudioUpload}
            onDelete={handleAudioDelete}
            onRename={handleAudioRename}
          />
          )
        )}

        {activeSection === 'social' && <SocialScreen />}
      </main>

      {activeTimer && activeTimerTask && (isFocusOverlayOpen || activeTimer.status === 'finished') && (
        <FocusTimerPanel
          timer={activeTimer}
          task={activeTimerTask}
          onPause={handlePauseFocus}
          onResume={handleResumeFocus}
          onComplete={handleCompleteFocus}
          onAdjust={(minutesDelta) => setState((current) => adjustTaskTimer(current, minutesDelta))}
          onMinimize={handleMinimizeFocus}
          onClose={handleCloseFocus}
        />
      )}

      {activeTimer && activeTimerTask && isFocusDockVisible && activeTimer.status !== 'finished' && (
        <FocusTimerDock timer={activeTimer} task={activeTimerTask} onRestore={handleRestoreFocus} />
      )}
    </div>
  )
}
