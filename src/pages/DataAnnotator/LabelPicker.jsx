import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LABEL_OPTIONS } from './mockData'

export default function LabelPicker({ x, y, onSelect, onCancel }) {
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef(null)
  const rootRef = useRef(null)
  const [pos, setPos] = useState({ x, y })

  const options = useMemo(
    () => LABEL_OPTIONS.filter((l) => l.toLowerCase().includes(query.trim().toLowerCase())),
    [query],
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setHighlighted(0)
  }, [query])

  // Keep the popup inside the viewport once it's mounted and measured.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const { innerWidth, innerHeight } = window
    const rect = el.getBoundingClientRect()
    let nextX = x
    let nextY = y
    if (rect.right > innerWidth - 8) nextX = x - (rect.right - innerWidth + 8)
    if (rect.bottom > innerHeight - 8) nextY = y - (rect.bottom - innerHeight + 8)
    if (nextX < 8) nextX = 8
    if (nextY < 8) nextY = 8
    if (nextX !== x || nextY !== y) setPos({ x: nextX, y: nextY })
  }, [x, y])

  const commit = (label) => {
    if (label) onSelect(label)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(options[highlighted])
    }
  }

  return (
    <>
      {/* backdrop: click outside cancels without starting a new shape */}
      <div
        className="fixed inset-0 z-40"
        onMouseDown={(e) => {
          e.stopPropagation()
          onCancel()
        }}
      />
      <div
        ref={rootRef}
        className="fixed z-50 flex w-56 flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60"
        style={{ left: pos.x, top: pos.y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="max-h-64 overflow-y-auto py-1">
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500">No matching labels</div>
          )}
          {options.map((label, i) => (
            <button
              key={label}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => commit(label)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm font-medium transition',
                i === highlighted ? 'bg-blue-600 text-white' : 'text-zinc-200 hover:bg-zinc-800',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 bg-zinc-950 px-3 py-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Select Label"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
          />
          <Search className="size-4 shrink-0 text-zinc-500" />
        </div>
      </div>
    </>
  )
}
