interface ProgressBarProps {
  label: string
  completed: number
  total: number
}

export function ProgressBar({ label, completed, total }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="progress-card">
      <div className="progress-header">
        <strong>{label}</strong>
        <span>
          {completed}/{total} ({percent}%)
        </span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
