import { getLocale } from '../../lib/i18n'
import type { AppLanguage, MindfulnessTrack } from '../../lib/storage/types'

interface AudioLibraryProps {
  language: AppLanguage
  tracks: MindfulnessTrack[]
  error: string | null
  onUpload: (files: FileList | null) => void
  onDelete: (trackId: string) => void
  onRename: (trackId: string, nextName: string) => void
}

export function AudioLibrary({ language, tracks, error, onUpload, onDelete, onRename }: AudioLibraryProps) {
  return (
    <section className="panel card-stack wide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Mindfulness' : 'Mindfulness'}</p>
          <h2>{language === 'en' ? 'Local audio library' : 'Lokale audiobibliotheek'}</h2>
        </div>
      </div>

      {error && <p className="helper-copy error-copy">{error}</p>}

      <div className="audio-list">
        {tracks.length === 0 && <p className="empty-copy">{language === 'en' ? 'No mindfulness audio added yet.' : 'Nog geen mindfulness-audio toegevoegd.'}</p>}
        {tracks.map((track) => (
          <article key={track.id} className="audio-card">
            <div className="audio-card-header">
              <div className="field audio-name-field">
                <span>{language === 'en' ? 'Name' : 'Naam'}</span>
                <input
                  defaultValue={track.name}
                  aria-label={language === 'en' ? `Name for ${track.name}` : `Naam voor ${track.name}`}
                  onBlur={(event) => onRename(track.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      onRename(track.id, event.currentTarget.value)
                      event.currentTarget.blur()
                    }
                  }}
                />
              </div>
              <button type="button" className="mini-button audio-delete-button" onClick={() => onDelete(track.id)}>
                {language === 'en' ? 'Delete' : 'Verwijder'}
              </button>
            </div>
            <div className="audio-meta">
              <p>{new Date(track.addedAt).toLocaleDateString(getLocale(language))} · {track.sizeLabel}</p>
            </div>
            <audio controls preload="none" src={track.url} />
          </article>
        ))}
      </div>

      <label className="upload-dropzone">
        <strong>{language === 'en' ? 'Add mindfulness audio' : 'Toevoegen mindfulness-audio'}</strong>
        <span>{language === 'en' ? 'Choose an mp3 or another audio file.' : 'Kies een mp3 of ander audiobestand.'}</span>
        <input type="file" accept="audio/*" multiple onChange={(event) => onUpload(event.target.files)} />
      </label>
    </section>
  )
}