interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      className="search"
      type="search"
      placeholder="Search achievements..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
