import { AchievementRow } from './AchievementRow'
import { ProgressBar } from './ProgressBar'
import type { AchievementCategory } from '../lib/schema'

interface CategoryPanelProps {
  category: AchievementCategory
  completedMap: Record<string, boolean>
  notesMap: Record<string, string>
  onToggle: (id: string, next: boolean) => void
  onNoteChange: (id: string, note: string) => void
}

export function CategoryPanel({ category, completedMap, notesMap, onToggle, onNoteChange }: CategoryPanelProps) {
  const completed = category.items.filter((item) => completedMap[item.id]).length

  return (
    <details className="category-panel" open>
      <summary>
        <span>{category.name}</span>
        <span>
          {completed}/{category.items.length}
        </span>
      </summary>
      <ProgressBar label={`${category.name} progress`} completed={completed} total={category.items.length} />
      <div className="category-list">
        {category.items.map((item) => (
          <AchievementRow
            key={item.id}
            item={item}
            completed={Boolean(completedMap[item.id])}
            note={notesMap[item.id]}
            onToggle={onToggle}
            onNoteChange={onNoteChange}
          />
        ))}
      </div>
    </details>
  )
}
