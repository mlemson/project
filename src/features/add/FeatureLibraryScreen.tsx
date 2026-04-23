import { getOptionalFeatureMeta } from '../../lib/i18n'
import type { AppLanguage, OptionalFeatureId, ProfileId } from '../../lib/storage/types'

interface FeatureLibraryScreenProps {
  language: AppLanguage
  profileId: ProfileId
  enabledFeatures: OptionalFeatureId[]
  onToggleFeature: (featureId: OptionalFeatureId) => void
}

const featureIds: OptionalFeatureId[] = ['mood', 'audio']

export function FeatureLibraryScreen({ language, profileId, enabledFeatures, onToggleFeature }: FeatureLibraryScreenProps) {
  const isPrivateProfile = profileId === 'private'

  return (
    <section className="panel card-stack wide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Add' : 'Toevoegen'}</p>
          <h2>{language === 'en' ? 'Add extra modules to your menu' : 'Voeg extra modules toe aan je menu'}</h2>
        </div>
      </div>

      <p className="helper-copy">
        {isPrivateProfile
          ? language === 'en'
            ? 'Toggle optional modules on or off. Added modules appear in the menu and on the dashboard.'
            : 'Zet optionele modules aan of uit. Toegevoegde modules verschijnen in het menu en op het dashboard.'
          : language === 'en'
            ? 'These optional modules are currently only available in the private profile.'
            : 'Deze optionele modules zijn op dit moment alleen beschikbaar in het priveprofiel.'}
      </p>

      <div className="summary-grid">
        {featureIds.map((featureId) => {
          const meta = getOptionalFeatureMeta(featureId, language)
          const enabled = enabledFeatures.includes(featureId)

          return (
            <article key={featureId} className="summary-card settings-card">
              <span className="stat-label">{language === 'en' ? 'Optional module' : 'Optionele module'}</span>
              <strong>{meta.title}</strong>
              <p>{meta.description}</p>
              <button
                type="button"
                className={enabled ? 'secondary-button' : 'primary-button'}
                disabled={!isPrivateProfile}
                onClick={() => onToggleFeature(featureId)}
              >
                {enabled
                  ? language === 'en' ? 'Remove from menu' : 'Verwijder uit menu'
                  : language === 'en' ? 'Add to menu' : 'Voeg toe aan menu'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}