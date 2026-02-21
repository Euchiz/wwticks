import type { AchievementItem } from '../lib/schema'

interface AchievementRowProps {
  item: AchievementItem
  completed: boolean
  note?: string
  onToggle: (id: string, next: boolean) => void
  onNoteChange: (id: string, note: string) => void
}

export function AchievementRow({ item, completed, note, onToggle, onNoteChange }: AchievementRowProps) {
  return (
    <div className="achievement-row">
      <label className="achievement-main">
        <input type="checkbox" checked={completed} onChange={(e) => onToggle(item.id, e.target.checked)} />
        <div>
          <div className="achievement-title">
            {item.name} {item.optional_meta?.points ? <small>({item.optional_meta.points} pts)</small> : null}
          </div>
          <div className="achievement-description">{item.description}</div>
          {item.optional_meta?.wiki_url ? (
            <a href={item.optional_meta.wiki_url} target="_blank" rel="noreferrer">
              Wiki
            </a>
          ) : null}
        </div>
      </label>
      <input
        className="note-input"
        type="text"
        placeholder="Optional note"
        value={note ?? ''}
        onChange={(e) => onNoteChange(item.id, e.target.value)}
      />
    </div>
  )
}
