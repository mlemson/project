import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FeatureLibraryScreen } from '../features/add/FeatureLibraryScreen'
import { AudioLibrary } from '../features/audio/AudioLibrary'
import { QuickCaptureBoard } from '../features/capture/QuickCaptureBoard'
import { DashboardScreen } from '../features/dashboard/DashboardScreen'
import { MoodCheckCard } from '../features/mood/MoodCheckCard'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { SocialScreen } from '../features/social/SocialScreen'
import { StatsScreen } from '../features/stats/StatsScreen'
import { FocusTimerDock, FocusTimerPanel } from '../features/tasks/FocusTimerPanel'
import { TaskBoard } from '../features/tasks/TaskBoard'
import {
  addCaptureNode,
  addTask,
  adjustTaskTimer,
  completeTaskTimer,
  deleteCaptureNode,
  deleteTask,
  dismissTaskTimer,
  getActiveProfile,
  loadAppState,
  pauseTaskTimer,
  replaceAppState,
  resumeTaskTimer,
  saveMoodEntry,
  startTaskTimer,
  switchProfile,
  toggleCaptureLink,
  toggleOptionalFeature,
  toggleTaskCompletion,
  updateCaptureNode,
  updateDashboardPanelOrder,
  updateLanguage,
  updateTaskCategories,
} from '../lib/storage/appStorage'
import {
  deleteMindfulnessTrack,
  loadMindfulnessTracks,
  renameMindfulnessTrack,
  saveMindfulnessTrack,
} from '../lib/storage/audioStorage'
import { getProfileLabel, getSectionLabel } from '../lib/i18n'
import { downloadAppState, importAppStateFile } from '../lib/transfer/appTransfer'
import { isTaskCompleted, isTaskVisibleToday } from '../lib/tasks/taskIntelligence'
import type { AppSection, AppState, DashboardPanelId, MindfulnessTrack, OptionalFeatureId, ProfileId, TaskItem } from '../lib/storage/types'

const optionalFeatureOrder: OptionalFeatureId[] = ['mood', 'audio']

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
  const language = state.settings.language
  const isPrivateProfile = state.activeProfile === 'private'
  const profileLabel = getProfileLabel(state.activeProfile, language)
  const profileSettings = state.settings.profiles[state.activeProfile]
  const enabledOptionalFeatures = profileSettings.enabledOptionalFeatures
  const activeTimer = profileState.activeTimer
  const activeTimerTask = activeTimer ? profileState.tasks.find((task) => task.id === activeTimer.taskId) : undefined

  const sections = useMemo(() => {
    const enabledPrivateSections = isPrivateProfile
      ? optionalFeatureOrder.filter((featureId) => enabledOptionalFeatures.includes(featureId))
      : []

    return (['dashboard', 'tasks', 'stats', 'capture', ...enabledPrivateSections, 'social', 'add', 'settings'] as AppSection[]).map((id) => ({
      id,
      label: getSectionLabel(id, language),
    }))
  }, [enabledOptionalFeatures, isPrivateProfile, language])

  const todayMood = useMemo(
    () => profileState.moodEntries.find((entry) => entry.date === state.today),
    [profileState.moodEntries, state.today],
  )

  const completedToday = profileState.tasks.filter((task) => isTaskCompleted(task, state.today)).length
  const importantOpenTasks = profileState.tasks.filter(
    (task) => task.important && isTaskVisibleToday(task, state.today) && !isTaskCompleted(task, state.today),
  ).length

  useEffect(() => {
    if (!sections.some((section) => section.id === activeSection)) {
      setActiveSection('dashboard')
    }
  }, [activeSection, sections])

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
          setAudioError(language === 'en'
            ? 'Mindfulness audio could not be loaded in this browser.'
            : 'Mindfulness-audio kon niet geladen worden in deze browser.')
        }
      })

    return () => {
      isActive = false
      tracks.forEach((track) => URL.revokeObjectURL(track.url))
    }
  }, [language])

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
      setAudioError(language === 'en'
        ? 'Saving audio failed. Try an mp3 or another audio file.'
        : 'Opslaan van audio lukte niet. Probeer een mp3 of ander audiobestand.')
    }
  }

  const handleAudioDelete = async (trackId: string) => {
    await deleteMindfulnessTrack(trackId)
    await refreshTracks()
  }

  const handleTaskAdd = (task: Omit<TaskItem, 'id' | 'completed' | 'createdAt' | 'completionDate' | 'completionHistory'>) => {
    setState((current) => addTask(current, task))
    setActiveSection('tasks')
  }

  const handleAudioRename = async (trackId: string, nextName: string) => {
    await renameMindfulnessTrack(trackId, nextName)
    await refreshTracks()
  }

  const handleExport = () => {
    downloadAppState(state)
    setTransferMessage(language === 'en' ? 'Export file downloaded.' : 'Exportbestand gedownload.')
  }

  const handleImport = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    try {
      const nextState = await importAppStateFile(files[0])
      setState(replaceAppState(nextState))
      setTransferMessage(language === 'en' ? 'Import succeeded.' : 'Import gelukt.')
    } catch {
      setTransferMessage(
        language === 'en'
          ? 'Import failed. Check whether you selected a valid export file.'
          : 'Import mislukt. Controleer of je een geldig exportbestand hebt gekozen.',
      )
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
    setState((current) => dismissTaskTimer(current))
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

    if (isPrivateProfile && enabledOptionalFeatures.includes('mood')) {
      availablePanels.push({
        id: 'mood',
        node: (
          <MoodCheckCard
            language={language}
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
          language={language}
          moodEntries={profileState.moodEntries}
          tasks={profileState.tasks}
          today={state.today}
          profileLabel={profileLabel}
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
          profileLabel={profileLabel}
          language={language}
          categories={profileSettings.taskCategories}
        />
      ),
    })

    if (isPrivateProfile && enabledOptionalFeatures.includes('audio')) {
      availablePanels.push({
        id: 'audio',
        node: (
          <AudioLibrary
            language={language}
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
    enabledOptionalFeatures,
    isPrivateProfile,
    language,
    profileLabel,
    profileSettings.taskCategories,
    profileState.captureNodes.length,
    profileState.dashboardPanelOrder,
    profileState.moodEntries,
    profileState.tasks,
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
      <header className="hero-card hero-card-compact">
        <div className="hero-primary">
          <div>
            <p className="eyebrow">Focus Flow</p>
            <h1>Focus Flow</h1>
          </div>
          <div className="profile-switch" aria-label={language === 'en' ? 'Switch profile' : 'Profiel wisselen'}>
            {(['private', 'work'] as ProfileId[]).map((profileId) => (
              <button
                key={profileId}
                type="button"
                className={profileId === state.activeProfile ? 'profile-pill active' : 'profile-pill'}
                onClick={() => setState((current) => switchProfile(current, profileId))}
              >
                {getProfileLabel(profileId, language)}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-stats">
          {isPrivateProfile && (
            <div>
              <span className="stat-label">{language === 'en' ? 'Today check-in' : 'Check-in vandaag'}</span>
              <strong>{todayMood ? todayMood.label : language === 'en' ? 'Not done yet' : 'Nog niet gedaan'}</strong>
            </div>
          )}
          <div>
            <span className="stat-label">{language === 'en' ? 'Tasks completed' : 'Taken afgerond'}</span>
            <strong>{completedToday}</strong>
          </div>
          <div>
            <span className="stat-label">{language === 'en' ? 'Important open tasks' : 'Belangrijke open taken'}</span>
            <strong>{importantOpenTasks}</strong>
          </div>
          {isPrivateProfile && (
            <div>
              <span className="stat-label">{language === 'en' ? 'Mindfulness tracks' : 'Mindfulness tracks'}</span>
              <strong>{tracks.length}</strong>
            </div>
          )}
          <div>
            <span className="stat-label">{language === 'en' ? 'Ideas' : 'Ideeen'}</span>
            <strong>{profileState.captureNodes.length}</strong>
          </div>
        </div>
      </header>

      <nav className="tab-bar" aria-label={language === 'en' ? 'Main navigation' : 'Hoofdnavigatie'}>
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
                  aria-label={language === 'en' ? 'Drag dashboard module' : 'Versleep dashboardmodule'}
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

        {isPrivateProfile && activeSection === 'mood' && enabledOptionalFeatures.includes('mood') && (
          <MoodCheckCard
            language={language}
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
            profileLabel={profileLabel}
            language={language}
            categories={profileSettings.taskCategories}
          />
        )}

        {activeSection === 'stats' && (
          <StatsScreen
            language={language}
            profileId={state.activeProfile}
            moodEntries={profileState.moodEntries}
            tasks={profileState.tasks}
            today={state.today}
          />
        )}

        {activeSection === 'capture' && (
          <QuickCaptureBoard
            language={language}
            nodes={profileState.captureNodes}
            links={profileState.captureLinks}
            onAddNode={() => setState((current) => addCaptureNode(current))}
            onUpdateNode={(nodeId, patch) => setState((current) => updateCaptureNode(current, nodeId, patch))}
            onDeleteNode={(nodeId) => setState((current) => deleteCaptureNode(current, nodeId))}
            onToggleLink={(fromId, toId) => setState((current) => toggleCaptureLink(current, fromId, toId))}
            onConvertToTask={handleTaskAdd}
          />
        )}

        {activeSection === 'audio' && isPrivateProfile && enabledOptionalFeatures.includes('audio') && (
          <AudioLibrary
            language={language}
            tracks={tracks}
            error={audioError}
            onUpload={handleAudioUpload}
            onDelete={handleAudioDelete}
            onRename={handleAudioRename}
          />
        )}

        {activeSection === 'social' && <SocialScreen language={language} />}

        {activeSection === 'add' && (
          <FeatureLibraryScreen
            language={language}
            profileId={state.activeProfile}
            enabledFeatures={enabledOptionalFeatures}
            onToggleFeature={(featureId) => setState((current) => toggleOptionalFeature(current, current.activeProfile, featureId))}
          />
        )}

        {activeSection === 'settings' && (
          <SettingsScreen
            language={language}
            profileLabel={profileLabel}
            categories={profileSettings.taskCategories}
            transferMessage={transferMessage}
            onLanguageChange={(nextLanguage) => setState((current) => updateLanguage(current, nextLanguage))}
            onExport={handleExport}
            onImport={handleImport}
            onAddCategory={(category) => {
              const value = category.trim()

              if (!value) {
                return
              }

              setState((current) => {
                const currentCategories = current.settings.profiles[current.activeProfile].taskCategories
                if (currentCategories.includes(value)) {
                  return current
                }

                return updateTaskCategories(current, current.activeProfile, [...currentCategories, value])
              })
            }}
            onRemoveCategory={(category) => {
              setState((current) => {
                const currentCategories = current.settings.profiles[current.activeProfile].taskCategories
                if (currentCategories.length <= 1) {
                  return current
                }

                return updateTaskCategories(
                  current,
                  current.activeProfile,
                  currentCategories.filter((item) => item !== category),
                )
              })
            }}
          />
        )}
      </main>

      {activeTimer && activeTimerTask && isFocusOverlayOpen && (
        <FocusTimerPanel
          language={language}
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
        <FocusTimerDock language={language} timer={activeTimer} task={activeTimerTask} onRestore={handleRestoreFocus} />
      )}
    </div>
  )
}