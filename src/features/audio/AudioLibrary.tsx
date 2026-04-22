import type { MindfulnessTrack } from '../../lib/storage/types'

interface AudioLibraryProps {
  tracks: MindfulnessTrack[]
  error: string | null
  onUpload: (files: FileList | null) => void
  onDelete: (trackId: string) => void
  onRename: (trackId: string, nextName: string) => void
}

export function AudioLibrary({ tracks, error, onUpload, onDelete, onRename }: AudioLibraryProps) {
  return (
    <section className="panel card-stack wide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Mindfulness</p>
        </div>
      </div>

      {error && <p className="helper-copy error-copy">{error}</p>}

      <div className="audio-list">
        {tracks.length === 0 && <p className="empty-copy">Nog geen mindfulness-audio toegevoegd.</p>}
        {tracks.map((track) => (
          <article key={track.id} className="audio-card">
            <div className="audio-card-header">
              <div className="field audio-name-field">
                <span>Naam</span>
                <input
                  defaultValue={track.name}
                  aria-label={`Naam voor ${track.name}`}
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
                Verwijder
              </button>
            </div>
            <div className="audio-meta">
              <p>{new Date(track.addedAt).toLocaleDateString('nl-NL')} · {track.sizeLabel}</p>
            </div>
            <audio controls preload="none" src={track.url} />
          </article>
        ))}
      </div>

      <label className="upload-dropzone">
        <strong>Toevoegen mindfulness audio</strong>
        <span>Kies een mp3 of ander audiobestand.</span>
        <input type="file" accept="audio/*" multiple onChange={(event) => onUpload(event.target.files)} />
      </label>
    </section>
  )
}