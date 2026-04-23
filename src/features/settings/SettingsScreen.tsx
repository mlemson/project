import { useEffect, useState } from 'react'
import type { AppLanguage } from '../../lib/storage/types'

interface SettingsScreenProps {
  language: AppLanguage
  profileLabel: string
  categories: string[]
  transferMessage: string | null
  onLanguageChange: (language: AppLanguage) => void
  onExport: () => void
  onImport: (files: FileList | null) => Promise<void>
  onAddCategory: (category: string) => void
  onRemoveCategory: (category: string) => void
}

export function SettingsScreen({
  language,
  profileLabel,
  categories,
  transferMessage,
  onLanguageChange,
  onExport,
  onImport,
  onAddCategory,
  onRemoveCategory,
}: SettingsScreenProps) {
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    setNewCategory('')
  }, [language, profileLabel])

  return (
    <section className="panel card-stack wide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Settings' : 'Instellingen'}</p>
          <h2>{language === 'en' ? 'Language, categories and import/export' : 'Taal, categorieen en import/export'}</h2>
        </div>
      </div>

      <div className="settings-grid">
        <article className="summary-card settings-card">
          <span className="stat-label">{language === 'en' ? 'Language' : 'Taal'}</span>
          <label className="field">
            <span>{language === 'en' ? 'Interface language' : 'Interfacetaal'}</span>
            <select value={language} onChange={(event) => onLanguageChange(event.target.value as AppLanguage)}>
              <option value="nl">Nederlands</option>
              <option value="en">English</option>
            </select>
          </label>
        </article>

        <article className="summary-card settings-card">
          <span className="stat-label">{language === 'en' ? 'Categories' : 'Categorieen'}</span>
          <strong>{profileLabel}</strong>
          <p>
            {language === 'en'
              ? 'These categories appear in the task form for the current profile.'
              : 'Deze categorieen verschijnen in het taakformulier voor het huidige profiel.'}
          </p>
          <div className="settings-tag-list">
            {categories.map((category) => (
              <button key={category} type="button" className="pill settings-tag" onClick={() => onRemoveCategory(category)}>
                {category} <span aria-hidden="true">x</span>
              </button>
            ))}
          </div>
          <div className="settings-category-form">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder={language === 'en' ? 'Add category' : 'Categorie toevoegen'}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                onAddCategory(newCategory)
                setNewCategory('')
              }}
            >
              {language === 'en' ? 'Add' : 'Toevoegen'}
            </button>
          </div>
        </article>

        <article className="summary-card settings-card">
          <span className="stat-label">{language === 'en' ? 'Data' : 'Gegevens'}</span>
          <strong>{language === 'en' ? 'Import or export local data' : 'Importeer of exporteer lokale data'}</strong>
          <div className="transfer-row">
            <button type="button" className="secondary-button" onClick={onExport}>
              Export
            </button>
            <label className="secondary-button import-button">
              Import
              <input type="file" accept="application/json" onChange={(event) => void onImport(event.target.files)} />
            </label>
          </div>
          {transferMessage && <p className="helper-copy">{transferMessage}</p>}
        </article>
      </div>
    </section>
  )
}