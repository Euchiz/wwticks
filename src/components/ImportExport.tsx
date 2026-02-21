import { useRef } from 'react'
import { exportProgress } from '../lib/storage'
import { validateProgressData, type ProgressData } from '../lib/schema'

interface ImportExportProps {
  progress: ProgressData
  onImport: (data: ProgressData, mode: 'replace' | 'merge') => void
}

export function ImportExport({ progress, onImport }: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const validation = validateProgressData(parsed)
      if (!validation.ok || !validation.data) {
        alert(validation.error ?? 'Invalid progress file.')
        return
      }

      const merge = window.confirm('Import mode: OK = merge, Cancel = replace.') ? 'merge' : 'replace'
      onImport(validation.data, merge)
    } catch {
      alert('Unable to parse JSON file.')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="import-export">
      <button type="button" onClick={() => exportProgress(progress)}>
        Export progress JSON
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()}>
        Import progress JSON
      </button>
      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="application/json,.json"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
