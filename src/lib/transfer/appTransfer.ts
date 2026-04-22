import { importAppState } from '../storage/appStorage'
import type { AppState } from '../storage/types'

export function downloadAppState(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `focus-flow-export-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function importAppStateFile(file: File): Promise<AppState> {
  const text = await file.text()
  return importAppState(text)
}