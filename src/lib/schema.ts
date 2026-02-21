export interface AchievementMeta {
  points?: number
  wiki_url?: string
}

export interface AchievementItem {
  id: string
  name: string
  description: string
  optional_meta?: AchievementMeta
}

export interface AchievementCategory {
  id: string
  name: string
  items: AchievementItem[]
}

export interface AchievementList {
  version: string
  updated_at: string
  categories: AchievementCategory[]
}

export interface IndexFile {
  latest: string
  versions: string[]
}

export interface ProgressData {
  schema_version: 1
  list_version: string
  updated_at: string
  completed: Record<string, boolean>
  notes: Record<string, string>
}

export interface ValidationResult<T> {
  ok: boolean
  data?: T
  error?: string
}

export const CURRENT_SCHEMA_VERSION = 1

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function validateProgressData(input: unknown): ValidationResult<ProgressData> {
  if (!isRecord(input)) {
    return { ok: false, error: 'Progress file must be a JSON object.' }
  }

  const schemaVersion = input.schema_version
  const listVersion = input.list_version
  const updatedAt = input.updated_at
  const completed = input.completed
  const notes = input.notes

  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return { ok: false, error: `Unsupported schema_version: ${String(schemaVersion)}.` }
  }

  if (typeof listVersion !== 'string' || listVersion.length === 0) {
    return { ok: false, error: 'list_version must be a non-empty string.' }
  }

  if (typeof updatedAt !== 'string' || Number.isNaN(Date.parse(updatedAt))) {
    return { ok: false, error: 'updated_at must be an ISO datetime string.' }
  }

  if (!isRecord(completed)) {
    return { ok: false, error: 'completed must be an object map.' }
  }

  if (!isRecord(notes)) {
    return { ok: false, error: 'notes must be an object map.' }
  }

  for (const value of Object.values(completed)) {
    if (typeof value !== 'boolean') {
      return { ok: false, error: 'completed values must be boolean.' }
    }
  }

  for (const value of Object.values(notes)) {
    if (typeof value !== 'string') {
      return { ok: false, error: 'notes values must be strings.' }
    }
  }

  return {
    ok: true,
    data: {
      schema_version: CURRENT_SCHEMA_VERSION,
      list_version: listVersion,
      updated_at: updatedAt,
      completed: completed as Record<string, boolean>,
      notes: notes as Record<string, string>,
    },
  }
}
