interface ResetButtonProps {
  onReset: () => void
}

export function ResetButton({ onReset }: ResetButtonProps) {
  return (
    <button
      type="button"
      className="danger"
      onClick={() => {
        if (window.confirm('Reset progress for this version?')) {
          onReset()
        }
      }}
    >
      Reset progress
    </button>
  )
}
