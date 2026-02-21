interface VersionPickerProps {
  versions: string[]
  currentVersion: string
  onChange: (version: string) => void
}

export function VersionPicker({ versions, currentVersion, onChange }: VersionPickerProps) {
  return (
    <label className="inline-control">
      Version
      <select value={currentVersion} onChange={(e) => onChange(e.target.value)}>
        {versions.map((version) => (
          <option key={version} value={version}>
            {version}
          </option>
        ))}
      </select>
    </label>
  )
}
