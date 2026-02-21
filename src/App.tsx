import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { CategoryPanel } from './components/CategoryPanel'
import { Filters, type CompletionFilter } from './components/Filters'
import { ImportExport } from './components/ImportExport'
import { ProgressBar } from './components/ProgressBar'
import { ResetButton } from './components/ResetButton'
import { SearchBar } from './components/SearchBar'
import { VersionPicker } from './components/VersionPicker'
import { createEmptyProgress, listStoredVersions, loadProgress, resetProgress, saveProgress } from './lib/storage'
import type { AchievementList, IndexFile, ProgressData } from './lib/schema'

function App() {
  const [versions, setVersions] = useState<string[]>([])
  const [selectedVersion, setSelectedVersion] = useState('')
  const [listData, setListData] = useState<AchievementList | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CompletionFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [completedFirst, setCompletedFirst] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  useEffect(() => {
    fetch('./data/index.json')
      .then((res) => res.json() as Promise<IndexFile>)
      .then((index) => {
        setVersions(index.versions)
        setSelectedVersion(index.latest)
      })
      .catch(() => {
        setVersions([])
      })
  }, [])

  useEffect(() => {
    if (!selectedVersion) return

    fetch(`./data/achievements_v${selectedVersion}.json`)
      .then((res) => res.json() as Promise<AchievementList>)
      .then((list) => {
        setListData(list)
        setProgress(loadProgress(list.version))
      })
      .catch(() => {
        setListData(null)
        setProgress(null)
      })
  }, [selectedVersion])

  useEffect(() => {
    if (progress) {
      saveProgress(progress)
    }
  }, [progress])

  const allItems = useMemo(() => listData?.categories.flatMap((cat) => cat.items) ?? [], [listData])

  const filteredCategories = useMemo(() => {
    if (!listData || !progress) return []

    const query = search.trim().toLowerCase()

    return listData.categories
      .filter((cat) => (categoryFilter === 'all' ? true : cat.id === categoryFilter))
      .map((cat) => {
        const items = [...cat.items]
          .filter((item) => {
            const completed = Boolean(progress.completed[item.id])
            const matchesStatus =
              filter === 'all' || (filter === 'completed' ? completed : !completed)
            const matchesSearch =
              query.length === 0 ||
              item.name.toLowerCase().includes(query) ||
              item.description.toLowerCase().includes(query)
            return matchesStatus && matchesSearch
          })

        if (completedFirst) {
          items.sort((a, b) => Number(Boolean(progress.completed[b.id])) - Number(Boolean(progress.completed[a.id])))
        }

        return {
          ...cat,
          items,
        }
      })
      .filter((cat) => cat.items.length > 0)
  }, [listData, progress, categoryFilter, filter, search, completedFirst])

  const completedCount = useMemo(() => {
    if (!progress) return 0
    return allItems.filter((item) => progress.completed[item.id]).length
  }, [allItems, progress])

  const handleToggle = (id: string, next: boolean) => {
    if (!progress) return
    setProgress({
      ...progress,
      completed: {
        ...progress.completed,
        [id]: next,
      },
      updated_at: new Date().toISOString(),
    })
  }

  const handleNoteChange = (id: string, note: string) => {
    if (!progress) return
    const nextNotes = { ...progress.notes }
    if (note.trim().length === 0) {
      delete nextNotes[id]
    } else {
      nextNotes[id] = note
    }

    setProgress({
      ...progress,
      notes: nextNotes,
      updated_at: new Date().toISOString(),
    })
  }

  const handleImport = (incoming: ProgressData, mode: 'replace' | 'merge') => {
    const existing = loadProgress(incoming.list_version)

    const next =
      mode === 'merge'
        ? {
            ...existing,
            completed: { ...existing.completed, ...incoming.completed },
            notes: { ...existing.notes, ...incoming.notes },
            updated_at: new Date().toISOString(),
          }
        : { ...incoming, updated_at: new Date().toISOString() }

    saveProgress(next)

    if (incoming.list_version !== selectedVersion) {
      const shouldSwitch = window.confirm(
        `Imported progress is for version ${incoming.list_version}. Switch to that version now?`,
      )
      if (shouldSwitch && versions.includes(incoming.list_version)) {
        setSelectedVersion(incoming.list_version)
      }
      return
    }

    setProgress(next)
  }

  const handleReset = () => {
    if (!selectedVersion) return
    resetProgress(selectedVersion)
    setProgress(createEmptyProgress(selectedVersion))
  }

  const hasUnknownProgress = progress
    ? Object.keys(progress.completed).some((id) => !allItems.find((item) => item.id === id))
    : false

  return (
    <main className="container">
      <header className="header">
        <h1>Achievement Checklist</h1>
        <button type="button" onClick={() => setShowAbout((v) => !v)}>
          {showAbout ? 'Back to checklist' : 'About / Data'}
        </button>
      </header>

      {showAbout ? (
        <section className="about">
          <p>No backend is used. Everything is stored in your browser via localStorage.</p>
          <p>Export your progress JSON to back up or move between devices.</p>
          <p>Stored versions detected in this browser: {listStoredVersions().join(', ') || 'none'}</p>
        </section>
      ) : null}

      {!showAbout && listData && progress ? (
        <>
          <section className="toolbar">
            <VersionPicker versions={versions} currentVersion={selectedVersion} onChange={setSelectedVersion} />
            <SearchBar value={search} onChange={setSearch} />
            <Filters
              filter={filter}
              onFilterChange={setFilter}
              category={categoryFilter}
              categories={listData.categories.map((cat) => ({ id: cat.id, name: cat.name }))}
              onCategoryChange={setCategoryFilter}
              completedFirst={completedFirst}
              onCompletedFirstChange={setCompletedFirst}
            />
            <ImportExport progress={progress} onImport={handleImport} />
            <ResetButton onReset={handleReset} />
          </section>

          <ProgressBar label="Overall progress" completed={completedCount} total={allItems.length} />

          {hasUnknownProgress ? (
            <p className="notice">Imported data includes unknown achievement ids; unknown entries are ignored in UI.</p>
          ) : null}

          <section className="categories">
            {filteredCategories.map((category) => (
              <CategoryPanel
                key={category.id}
                category={category}
                completedMap={progress.completed}
                notesMap={progress.notes}
                onToggle={handleToggle}
                onNoteChange={handleNoteChange}
              />
            ))}
            {filteredCategories.length === 0 ? <p>No achievements match the current filters.</p> : null}
          </section>
        </>
      ) : (
        <p>Loading achievement data...</p>
      )}
    </main>
  )
}

export default App
