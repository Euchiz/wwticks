export type CompletionFilter = 'all' | 'completed' | 'incomplete'

interface FiltersProps {
  filter: CompletionFilter
  onFilterChange: (value: CompletionFilter) => void
  category: string
  categories: Array<{ id: string; name: string }>
  onCategoryChange: (value: string) => void
  completedFirst: boolean
  onCompletedFirstChange: (value: boolean) => void
}

export function Filters({
  filter,
  onFilterChange,
  category,
  categories,
  onCategoryChange,
  completedFirst,
  onCompletedFirstChange,
}: FiltersProps) {
  return (
    <div className="filters">
      <label className="inline-control">
        Status
        <select value={filter} onChange={(e) => onFilterChange(e.target.value as CompletionFilter)}>
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </label>

      <label className="inline-control">
        Category
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          <option value="all">All</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </label>

      <label className="inline-control checkbox-inline">
        <input
          type="checkbox"
          checked={completedFirst}
          onChange={(e) => onCompletedFirstChange(e.target.checked)}
        />
        Completed first
      </label>
    </div>
  )
}
