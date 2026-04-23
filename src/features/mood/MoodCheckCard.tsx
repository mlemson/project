import { useMemo, useState } from 'react'
import { getMoodOptions } from '../../lib/i18n'
import type { AppLanguage, MoodColor, MoodEntry } from '../../lib/storage/types'

interface MoodCheckCardProps {
  language: AppLanguage
  entries: MoodEntry[]
  today: string
  onSave: (entry: MoodEntry) => void
}

export function MoodCheckCard({ language, entries, today, onSave }: MoodCheckCardProps) {
  const moodOptions = getMoodOptions(language) as Array<{ color: MoodColor; label: string; caption: string }>
  const currentEntry = entries.find((entry) => entry.date === today)
  const [selectedColor, setSelectedColor] = useState<MoodColor>(currentEntry?.color ?? 'yellow')
  const [note, setNote] = useState(currentEntry?.note ?? '')

  const monthlySummary = useMemo(() => {
    const monthPrefix = today.slice(0, 7)
    return entries.filter((entry) => entry.date.startsWith(monthPrefix)).sort((left, right) => left.date.localeCompare(right.date))
  }, [entries, today])

  const monthCells = useMemo(() => buildMonthCells(today, monthlySummary), [monthlySummary, today])

  return (
    <section className="panel card-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Daily check-in' : 'Dagelijkse check'}</p>
          <h2>{language === 'en' ? 'How are you today?' : 'Hoe voel je je vandaag?'}</h2>
        </div>
        <span className="soft-badge">{language === 'en' ? 'Stored locally' : 'Lokaal opgeslagen'}</span>
      </div>

      <div className="mood-grid">
        {moodOptions.map((option) => (
          <button
            key={option.color}
            type="button"
            className={selectedColor === option.color ? `mood-option ${option.color} active` : `mood-option ${option.color}`}
            onClick={() => setSelectedColor(option.color)}
          >
            <strong>{option.label}</strong>
            <span>{option.caption}</span>
          </button>
        ))}
      </div>

      <label className="field">
        <span>{language === 'en' ? 'Short note' : 'Korte notitie'}</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder={language === 'en' ? 'What stood out today?' : 'Wat viel op vandaag?'}
        />
      </label>

      <button
        type="button"
        className="primary-button"
        onClick={() =>
          onSave({
            date: today,
            color: selectedColor,
            label: moodOptions.find((option) => option.color === selectedColor)?.label ?? (language === 'en' ? 'Unknown' : 'Onbekend'),
            note,
          })
        }
      >
        {language === 'en' ? 'Save check-in' : 'Bewaar check-in'}
      </button>

      <div className="month-strip">
        <div className="section-heading compact">
          <h3>{language === 'en' ? 'This month' : 'Deze maand'}</h3>
          <span>{monthlySummary.length} {language === 'en' ? 'saved' : 'ingevoerd'}</span>
        </div>
        <div className="calendar-grid" aria-label={language === 'en' ? 'Monthly mood overview' : 'Maandoverzicht stemming'}>
          {monthCells.map((cell) => (
            <div
              key={cell.key}
              className={cell.entry ? `calendar-cell ${cell.entry.color}` : 'calendar-cell empty'}
              title={cell.entry ? `${cell.entry.date}: ${cell.entry.label}${cell.entry.note ? ` - ${cell.entry.note}` : ''}` : cell.key}
            >
              <span>{cell.dayLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function buildMonthCells(today: string, monthlySummary: MoodEntry[]) {
  const [year, month] = today.split('-').map(Number)
  const totalDays = new Date(year, month, 0).getDate()
  const monthMap = new Map(monthlySummary.map((entry) => [entry.date, entry]))

  return Array.from({ length: totalDays }, (_, index) => {
    const date = `${today.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`
    return {
      key: date,
      dayLabel: String(index + 1),
      entry: monthMap.get(date),
    }
  })
}