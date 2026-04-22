import type { MindfulnessTrack } from './types'

const DATABASE_NAME = 'focus-flow-audio'
const DATABASE_VERSION = 1
const STORE_NAME = 'mindfulness-tracks'

interface StoredTrack {
  id: string
  name: string
  addedAt: string
  type: string
  size: number
  blob: Blob
}

export async function loadMindfulnessTracks(): Promise<MindfulnessTrack[]> {
  const db = await openDatabase()
  const items = await requestToPromise<StoredTrack[]>(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll())

  return items
    .sort((left, right) => right.addedAt.localeCompare(left.addedAt))
    .map((item) => ({
      id: item.id,
      name: item.name,
      addedAt: item.addedAt,
      sizeLabel: formatSize(item.size),
      url: URL.createObjectURL(item.blob),
    }))
}

export async function saveMindfulnessTrack(file: File): Promise<void> {
  const db = await openDatabase()
  const record: StoredTrack = {
    id: createId(),
    name: file.name,
    addedAt: new Date().toISOString(),
    type: file.type,
    size: file.size,
    blob: file,
  }

  await requestToPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record))
}

export async function deleteMindfulnessTrack(trackId: string): Promise<void> {
  const db = await openDatabase()
  await requestToPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(trackId))
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function formatSize(size: number) {
  const mb = size / (1024 * 1024)

  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function createId() {
  return `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function renameMindfulnessTrack(trackId: string, nextName: string): Promise<void> {
  const db = await openDatabase()
  const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME)
  const current = await requestToPromise<StoredTrack | undefined>(store.get(trackId))

  if (!current) {
    return
  }

  await requestToPromise(store.put({
    ...current,
    name: nextName.trim() || current.name,
  }))
}