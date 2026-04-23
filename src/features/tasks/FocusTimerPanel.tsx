import { useEffect, useRef, useState } from 'react'
import type { AppLanguage, FocusTimerState, TaskItem } from '../../lib/storage/types'

interface FocusTimerPanelProps {
  language: AppLanguage
  timer: FocusTimerState
  task: TaskItem
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onAdjust: (minutesDelta: number) => void
  onMinimize: () => void
  onClose: () => void
}

export function FocusTimerPanel({ language, timer, task, onPause, onResume, onComplete, onAdjust, onMinimize, onClose }: FocusTimerPanelProps) {
  const [customMinutes, setCustomMinutes] = useState(5)
  const [remainingSeconds, setRemainingSeconds] = useState(() => getRemainingSeconds(timer))
  const announcedCompletionRef = useRef<string | undefined>(undefined)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const completionCardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setRemainingSeconds(getRemainingSeconds(timer))

    if (timer.status !== 'running' || !timer.endsAt) {
      return
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(timer))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [timer])

  useEffect(() => {
    if (timer.status !== 'finished' || !timer.completedAt || announcedCompletionRef.current === timer.completedAt) {
      return
    }

    announcedCompletionRef.current = timer.completedAt
    completionCardRef.current?.focus()
    playCompletionPing()
  }, [timer.completedAt, timer.status])

  const progress = Math.max(0, Math.min(1, remainingSeconds / Math.max(1, timer.durationSeconds)))
  const timerLabel = formatSeconds(remainingSeconds)

  useEffect(() => {
    progressBarRef.current?.style.setProperty('--focus-progress', `${progress}`)
  }, [progress])

  return (
    <div className={timer.status === 'finished' ? 'focus-overlay finished' : 'focus-overlay'}>
      <aside
        className={timer.status === 'finished' ? 'focus-timer-panel finished' : 'focus-timer-panel'}
        role="dialog"
        aria-modal="true"
        aria-label={language === 'en' ? 'Focus timer' : 'Focus timer'}
      >
        <div className="focus-timer-header">
          <div>
            <span className="eyebrow">{language === 'en' ? 'Focus timer' : 'Focus timer'}</span>
            <h3>{task.title}</h3>
          </div>
          <div className="timer-header-actions">
            {timer.status !== 'finished' && (
              <button type="button" className="ghost-button" onClick={onMinimize}>
                {language === 'en' ? 'Minimize' : 'In hoek'}
              </button>
            )}
            <button type="button" className="ghost-button" onClick={onClose}>
              {timer.status === 'finished'
                ? language === 'en' ? 'Close' : 'Sluiten'
                : language === 'en' ? 'Close and reset' : 'Sluit en reset'}
            </button>
          </div>
        </div>

        <div className="focus-timer-clock-row">
          <strong className="focus-timer-clock">{timerLabel}</strong>
          <span className="pill muted">{task.durationMinutes} {language === 'en' ? 'min planned' : 'min gepland'}</span>
        </div>

        <div className="focus-progress-track" aria-hidden="true">
          <div ref={progressBarRef} className="focus-progress-bar" />
        </div>

        <p className="helper-copy">
          {timer.status === 'finished'
            ? language === 'en'
              ? 'Time is up. The task has been marked as completed.'
              : 'Tijd is om. De taak is automatisch als afgerond gemarkeerd.'
            : language === 'en'
              ? 'This focus layer blocks the rest of the screen until you pause it, reset it or finish it.'
              : 'Deze focuslaag blokkeert de rest van het scherm totdat je pauzeert, reset of afrondt.'}
        </p>

        {timer.status === 'finished' && (
          <div ref={completionCardRef} className="focus-complete-card" tabIndex={-1}>
            <span className="focus-complete-badge">{language === 'en' ? 'Done' : 'Afgerond'}</span>
            <h4>{language === 'en' ? 'This focus round is done.' : 'Deze focusronde zit erop.'}</h4>
            <p>
              {language === 'en'
                ? `${task.title} is saved. Take a short breath or move to the next small step.`
                : `${task.title} is opgeslagen. Neem een korte ademruimte of kies je volgende kleine stap.`}
            </p>
          </div>
        )}

        {timer.status !== 'finished' && (
          <div className="timer-action-row">
            <button type="button" className="primary-button" onClick={timer.status === 'running' ? onPause : onResume}>
              {timer.status === 'running'
                ? language === 'en' ? 'Pause focus' : 'Pauzeer focus'
                : language === 'en' ? 'Resume focus' : 'Hervat focus'}
            </button>
            <button type="button" className="secondary-button secondary-button-strong" onClick={onComplete}>
              {language === 'en' ? 'Done' : 'Klaar'}
            </button>
            <button type="button" className="secondary-button" onClick={() => onAdjust(5)}>
              +5 min
            </button>
            <button type="button" className="secondary-button" onClick={() => onAdjust(10)}>
              +10 min
            </button>
          </div>
        )}

        {timer.status !== 'finished' && (
          <div className="timer-adjust-row">
            <label className="field">
              <span>{language === 'en' ? 'Adjust time' : 'Tijd aanpassen'}</span>
              <input
                type="number"
                min={1}
                step={1}
                value={customMinutes}
                onChange={(event) => setCustomMinutes(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
            <button type="button" className="secondary-button" onClick={() => onAdjust(customMinutes)}>
              {language === 'en' ? 'Add time' : 'Tijd toevoegen'}
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}

function getRemainingSeconds(timer: FocusTimerState) {
  if (timer.status === 'running' && timer.endsAt) {
    return Math.max(0, Math.ceil((Date.parse(timer.endsAt) - Date.now()) / 1000))
  }

  return timer.remainingSeconds
}

function formatSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function playCompletionPing() {
  const audioContext = new window.AudioContext()
  const masterGain = audioContext.createGain()
  masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime)
  masterGain.gain.exponentialRampToValueAtTime(0.09, audioContext.currentTime + 0.02)
  masterGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1)
  masterGain.connect(audioContext.destination)

  playTone(audioContext, masterGain, 'triangle', 880, audioContext.currentTime, 0.18)
  playTone(audioContext, masterGain, 'sine', 1320, audioContext.currentTime + 0.14, 0.22)
  playTone(audioContext, masterGain, 'triangle', 1760, audioContext.currentTime + 0.32, 0.16)

  window.setTimeout(() => {
    void audioContext.close()
  }, 1100)
}

function playTone(
  audioContext: AudioContext,
  destination: GainNode,
  type: OscillatorType,
  frequency: number,
  startTime: number,
  duration: number,
) {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.6, startTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

interface FocusTimerDockProps {
  language: AppLanguage
  timer: FocusTimerState
  task: TaskItem
  onRestore: () => void
}

export function FocusTimerDock({ language, timer, task, onRestore }: FocusTimerDockProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => getRemainingSeconds(timer))

  useEffect(() => {
    setRemainingSeconds(getRemainingSeconds(timer))

    if (timer.status !== 'running' || !timer.endsAt) {
      return
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(timer))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [timer])

  return (
    <button type="button" className="focus-timer-dock" onClick={onRestore}>
      <span className="eyebrow">{language === 'en' ? 'Focus active' : 'Focus actief'}</span>
      <strong>{formatSeconds(remainingSeconds)}</strong>
      <span>{task.title}</span>
    </button>
  )
}