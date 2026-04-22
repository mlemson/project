import { useEffect, useState } from 'react'

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

const fallbackGoals: SharedGoal[] = [
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

export function SocialScreen() {
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
  }, [])

  return (
    <section className="panel card-stack wide-panel social-screen">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sociaal</p>
          <h2>Gedeelde doelstellingen en volgers</h2>
        </div>
        <span className="soft-badge">{usingFallback ? 'Demo data' : 'Live API'}</span>
      </div>

      <article className="social-intro-card">
        <strong>Idee voor accountability</strong>
        <p>
          Deel alleen de doelen of routines die jij wilt delen, bijvoorbeeld: muziek maken, dagelijks 10 minuten.
          Volgers zien alleen voortgang, streaks en of je je dagelijkse taak hebt gehaald.
        </p>
      </article>

      <div className="social-goal-grid">
        {goals.map((goal) => (
          <article key={goal.id} className="social-goal-card">
            <div className="social-goal-top">
              <div>
                <span className="stat-label">Gedeeld doel</span>
                <h3>{goal.title}</h3>
              </div>
              <span className={goal.todayDone ? 'pill success' : 'pill muted'}>
                {goal.todayDone ? 'Vandaag gehaald' : 'Vandaag open'}
              </span>
            </div>

            <div className="social-goal-stats">
              <div>
                <span className="stat-label">Ritme</span>
                <strong>{goal.cadence}</strong>
              </div>
              <div>
                <span className="stat-label">Dagdoel</span>
                <strong>{goal.minutesPerDay} min</strong>
              </div>
              <div>
                <span className="stat-label">Streak</span>
                <strong>{goal.streak} dagen</strong>
              </div>
              <div>
                <span className="stat-label">Score</span>
                <strong>{goal.completionRate}%</strong>
              </div>
            </div>

            <p className="helper-copy">Laatst bijgewerkt: {goal.lastUpdate}</p>

            <div className="social-follower-row">
              <span className="stat-label">Gedeeld met</span>
              <div className="social-chip-row">
                {goal.sharedWith.map((name) => (
                  <span key={name} className="pill muted">{name}</span>
                ))}
              </div>
            </div>

            <div className="social-follower-row">
              <span className="stat-label">Volgers</span>
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
