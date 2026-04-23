import type { AppLanguage, AppSection, OptionalFeatureId, ProfileId, Weekday } from './storage/types'

export function getLocale(language: AppLanguage) {
  return language === 'en' ? 'en-US' : 'nl-NL'
}

export function getProfileLabel(profileId: ProfileId, language: AppLanguage) {
  if (language === 'en') {
    return profileId === 'private' ? 'Private' : 'Work'
  }

  return profileId === 'private' ? 'Prive' : 'Werk'
}

export function getSectionLabel(section: AppSection, language: AppLanguage) {
  const labels: Record<AppSection, Record<AppLanguage, string>> = {
    dashboard: { nl: 'Dashboard', en: 'Dashboard' },
    tasks: { nl: 'Taken', en: 'Tasks' },
    stats: { nl: 'Statistieken', en: 'Stats' },
    capture: { nl: 'Ideeen', en: 'Ideas' },
    social: { nl: 'Sociaal', en: 'Social' },
    add: { nl: 'Toevoegen', en: 'Add' },
    settings: { nl: 'Instellingen', en: 'Settings' },
    mood: { nl: 'Check-in', en: 'Check-in' },
    audio: { nl: 'Mindfulness', en: 'Mindfulness' },
  }

  return labels[section][language]
}

export function getWeekdayOptions(language: AppLanguage): Array<{ value: Weekday; label: string }> {
  const labels: Record<Weekday, Record<AppLanguage, string>> = {
    monday: { nl: 'Maandag', en: 'Monday' },
    tuesday: { nl: 'Dinsdag', en: 'Tuesday' },
    wednesday: { nl: 'Woensdag', en: 'Wednesday' },
    thursday: { nl: 'Donderdag', en: 'Thursday' },
    friday: { nl: 'Vrijdag', en: 'Friday' },
    saturday: { nl: 'Zaterdag', en: 'Saturday' },
    sunday: { nl: 'Zondag', en: 'Sunday' },
  }

  return Object.entries(labels).map(([value, label]) => ({ value: value as Weekday, label: label[language] }))
}

export function getWeekdayLabel(weekday: Weekday | undefined, language: AppLanguage) {
  const match = getWeekdayOptions(language).find((option) => option.value === weekday)
  if (match) {
    return match.label
  }

  return language === 'en' ? 'Weekly' : 'Wekelijks'
}

export function getMoodOptions(language: AppLanguage) {
  return language === 'en'
    ? [
        { color: 'red', label: 'Red', caption: 'Overstimulated or flat' },
        { color: 'orange', label: 'Orange', caption: 'Restless but still moving' },
        { color: 'yellow', label: 'Yellow', caption: 'Neutral or searching' },
        { color: 'lime', label: 'Light green', caption: 'Reasonably balanced' },
        { color: 'green', label: 'Green', caption: 'Calm, clear and steady' },
      ]
    : [
        { color: 'red', label: 'Rood', caption: 'Overprikkeld of leeg' },
        { color: 'orange', label: 'Oranje', caption: 'Onrustig, maar nog op de been' },
        { color: 'yellow', label: 'Geel', caption: 'Neutraal of zoekend' },
        { color: 'lime', label: 'Lichtgroen', caption: 'Redelijk in balans' },
        { color: 'green', label: 'Groen', caption: 'Rustig, helder en stabiel' },
      ]
}

export function getDefaultCategories(profileId: ProfileId, language: AppLanguage) {
  if (profileId === 'work') {
    return language === 'en'
      ? ['Deep work', 'Meetings', 'Email', 'Planning', 'Follow-up', 'Admin', 'Research']
      : ['Focuswerk', 'Overleggen', 'E-mail', 'Planning', 'Opvolging', 'Administratie', 'Onderzoek']
  }

  return language === 'en'
    ? ['Home', 'Self-care', 'Health', 'Family', 'Errands', 'Finance', 'Learning']
    : ['Thuis', 'Zelfzorg', 'Gezondheid', 'Familie', 'Boodschappen', 'Financien', 'Leren']
}

export function getOptionalFeatureMeta(featureId: OptionalFeatureId, language: AppLanguage) {
  const features: Record<OptionalFeatureId, Record<AppLanguage, { title: string; description: string }>> = {
    mood: {
      nl: {
        title: 'Check-in',
        description: 'Voeg een dagelijkse gevoelcheck toe aan menu en dashboard.',
      },
      en: {
        title: 'Check-in',
        description: 'Add a daily mood check to the menu and dashboard.',
      },
    },
    audio: {
      nl: {
        title: 'Mindfulness',
        description: 'Voeg je lokale mindfulness-bibliotheek toe aan menu en dashboard.',
      },
      en: {
        title: 'Mindfulness',
        description: 'Add your local mindfulness library to the menu and dashboard.',
      },
    },
  }

  return features[featureId][language]
}