import { useEffect, useMemo, useState } from 'react'
import type { AppLanguage } from '../../lib/storage/types'

interface SocialFollower {
  id: string
  name: string
  handle: string
}

interface SharedGoal {
  id: string
  title: string
  cadence: string
  minutesPerDay: number
  streak: number
  completionRate: number
  followers: SocialFollower[]
  sharedWith: string[]
  lastUpdate: string
  todayDone: boolean
}

interface SocialScreenProps {
  language: AppLanguage
}

export function SocialScreen({ language }: SocialScreenProps) {
  const fallbackGoals = useMemo(() => getFallbackGoals(language), [language])
  const [goals, setGoals] = useState<SharedGoal[]>(fallbackGoals)
  const [usingFallback, setUsingFallback] = useState(true)

  useEffect(() => {
    let isActive = true

    fetch('/api/social-goals')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('api unavailable')
        }

        const payload = await response.json() as { goals?: SharedGoal[] }
        if (isActive && payload.goals?.length) {
          setGoals(payload.goals)
          setUsingFallback(false)
        }
      })
      .catch(() => {
        if (isActive) {
          setGoals(fallbackGoals)
          setUsingFallback(true)
        }
      })

    return () => {
      isActive = false
    }
  }, [fallbackGoals])

  return (
    <section className="panel card-stack wide-panel social-screen">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Social' : 'Sociaal'}</p>
          <h2>{language === 'en' ? 'Shared goals and followers' : 'Gedeelde doelstellingen en volgers'}</h2>
        </div>
        <span className="soft-badge">{usingFallback ? (language === 'en' ? 'Demo data' : 'Demo data') : 'Live API'}</span>
      </div>

      <article className="social-intro-card">
        <strong>{language === 'en' ? 'Idea for accountability' : 'Idee voor accountability'}</strong>
        <p>
          {language === 'en'
            ? 'Share only the goals or routines you want to share. Followers only see progress, streaks and whether you completed the day.'
            : 'Deel alleen de doelen of routines die jij wilt delen. Volgers zien alleen voortgang, streaks en of je je dag hebt gehaald.'}
        </p>
      </article>

      <div className="social-goal-grid">
        {goals.map((goal) => (
          <article key={goal.id} className="social-goal-card">
            <div className="social-goal-top">
              <div>
                <span className="stat-label">{language === 'en' ? 'Shared goal' : 'Gedeeld doel'}</span>
                <h3>{goal.title}</h3>
              </div>
              <span className={goal.todayDone ? 'pill success' : 'pill muted'}>
                {goal.todayDone ? (language === 'en' ? 'Done today' : 'Vandaag gehaald') : (language === 'en' ? 'Open today' : 'Vandaag open')}
              </span>
            </div>

            <div className="social-goal-stats">
              <div>
                <span className="stat-label">{language === 'en' ? 'Rhythm' : 'Ritme'}</span>
                <strong>{goal.cadence}</strong>
              </div>
              <div>
                <span className="stat-label">{language === 'en' ? 'Daily goal' : 'Dagdoel'}</span>
                <strong>{goal.minutesPerDay} min</strong>
              </div>
              <div>
                <span className="stat-label">Streak</span>
                <strong>{goal.streak} {language === 'en' ? 'days' : 'dagen'}</strong>
              </div>
              <div>
                <span className="stat-label">{language === 'en' ? 'Score' : 'Score'}</span>
                <strong>{goal.completionRate}%</strong>
              </div>
            </div>

            <p className="helper-copy">{language === 'en' ? 'Last update:' : 'Laatst bijgewerkt:'} {goal.lastUpdate}</p>

            <div className="social-follower-row">
              <span className="stat-label">{language === 'en' ? 'Shared with' : 'Gedeeld met'}</span>
              <div className="social-chip-row">
                {goal.sharedWith.map((name) => (
                  <span key={name} className="pill muted">{name}</span>
                ))}
              </div>
            </div>

            <div className="social-follower-row">
              <span className="stat-label">{language === 'en' ? 'Followers' : 'Volgers'}</span>
              <div className="social-chip-row">
                {goal.followers.map((follower) => (
                  <span key={follower.id} className="pill">{follower.name} {follower.handle}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function getFallbackGoals(language: AppLanguage): SharedGoal[] {
  return language === 'en'
    ? [
        {
          id: 'goal-1',
          title: 'Make music',
          cadence: 'Daily',
          minutesPerDay: 10,
          streak: 6,
          completionRate: 86,
          followers: [
            { id: 'f-1', name: 'Lina', handle: '@lina' },
            { id: 'f-2', name: 'Sam', handle: '@sam' },
          ],
          sharedWith: ['Lina', 'Sam'],
          lastUpdate: 'Today 09:10',
          todayDone: true,
        },
        {
          id: 'goal-2',
          title: 'Write every day',
          cadence: 'Workdays',
          minutesPerDay: 15,
          streak: 3,
          completionRate: 71,
          followers: [
            { id: 'f-3', name: 'Noor', handle: '@noor' },
          ],
          sharedWith: ['Noor'],
          lastUpdate: 'Yesterday 21:05',
          todayDone: false,
        },
      ]
    : [
        {
          id: 'goal-1',
          title: 'Muziek maken',
          cadence: 'Dagelijks',
          minutesPerDay: 10,
          streak: 6,
          completionRate: 86,
          followers: [
            { id: 'f-1', name: 'Lina', handle: '@lina' },
            { id: 'f-2', name: 'Sam', handle: '@sam' },
          ],
          sharedWith: ['Lina', 'Sam'],
          lastUpdate: 'Vandaag 09:10',
          todayDone: true,
        },
        {
          id: 'goal-2',
          title: 'Elke dag schrijven',
          cadence: 'Werkdagen',
          minutesPerDay: 15,
          streak: 3,
          completionRate: 71,
          followers: [
            { id: 'f-3', name: 'Noor', handle: '@noor' },
          ],
          sharedWith: ['Noor'],
          lastUpdate: 'Gisteren 21:05',
          todayDone: false,
        },
      ]
}