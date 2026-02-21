import { CURRENT_SCHEMA_VERSION, type ProgressData } from './schema'

const storageKey = (version: string) => `achv_progress:${version}`

const nowIso = () => new Date().toISOString()

export function createEmptyProgress(version: string): ProgressData {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    list_version: version,
    updated_at: nowIso(),
    completed: {},
    notes: {},
  }
}

export function loadProgress(version: string): ProgressData {
  const fallback = createEmptyProgress(version)
  const raw = localStorage.getItem(storageKey(version))
  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProgressData>
    if (parsed.schema_version !== CURRENT_SCHEMA_VERSION || parsed.list_version !== version) {
      return fallback
    }

    return {
      schema_version: CURRENT_SCHEMA_VERSION,
      list_version: version,
      updated_at: typeof parsed.updated_at === 'string' ? parsed.updated_at : nowIso(),
      completed: parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {},
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
    }
  } catch {
    return fallback
  }
}

export function saveProgress(progress: ProgressData): void {
  const next = {
    ...progress,
    updated_at: nowIso(),
  }
  localStorage.setItem(storageKey(progress.list_version), JSON.stringify(next))
}

export function resetProgress(version: string): void {
  localStorage.removeItem(storageKey(version))
}

export function exportProgress(progress: ProgressData): void {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `progress_${progress.list_version}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function listStoredVersions(): string[] {
  const versions: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith('achv_progress:')) {
      versions.push(key.replace('achv_progress:', ''))
    }
  }
  return versions.sort()
}
