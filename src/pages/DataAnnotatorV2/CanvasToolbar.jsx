import { useRef } from 'react'
import { Undo2, Redo2, Move, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const ZOOM_MIN = 1
const ZOOM_MAX = 2.5

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export default function CanvasToolbar({
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  panMode,
  onTogglePan,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  zoom,
}) {
  const trackRef = useRef(null)
  const fillPercent = ((zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100
  const dragStartZoomRef = useRef(zoom)

  const zoomFromClientY = (clientY) => {
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = clamp((rect.bottom - clientY) / rect.height, 0, 1)
    return ZOOM_MIN + ratio * (ZOOM_MAX - ZOOM_MIN)
  }

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartZoomRef.current = zoom
    onZoomChange(zoomFromClientY(e.clientY))
  }

  const handlePointerMove = (e) => {
    if (e.buttons !== 1) return
    onZoomChange(zoomFromClientY(e.clientY))
  }

  // One event per drag gesture (not per pointermove tick), reporting net
  // direction/magnitude so slider usage is comparable to button and
  // trackpad zoom in the analysis.
  const handlePointerUp = () => {
    const delta = zoom - dragStartZoomRef.current
    if (delta === 0) return
    track('canvas_zoom', {
      direction: delta > 0 ? 'in' : 'out',
      method: 'slider',
      magnitude: Math.round(Math.abs(delta) * 100),
    })
  }

  return (
    <div className="absolute top-4 right-4 flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 p-1.5 shadow-2xl shadow-black/60">
      <IconButton icon={Undo2} label="Undo" onClick={onUndo} disabled={!canUndo} />
      <IconButton icon={Redo2} label="Redo" onClick={onRedo} disabled={!canRedo} />
      <div className="my-0.5 h-px w-6 bg-white/10" />
      <IconButton icon={Move} label="Pan" onClick={onTogglePan} active={panMode} />
      <IconButton icon={Plus} label="Zoom in" onClick={onZoomIn} disabled={zoom >= ZOOM_MAX} />
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex h-16 w-6 touch-none items-center justify-center py-1"
      >
        <div className="relative h-full w-1 cursor-pointer rounded-full bg-zinc-700">
          <div
            className="absolute bottom-0 w-full rounded-full bg-zinc-500"
            style={{ height: `${fillPercent}%` }}
          />
          <div
            className="absolute left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-zinc-400 bg-zinc-100 shadow"
            style={{ bottom: `calc(${fillPercent}% - 6px)` }}
          />
        </div>
      </div>
      <IconButton icon={Minus} label="Zoom out" onClick={onZoomOut} disabled={zoom <= ZOOM_MIN} />
    </div>
  )
}

function IconButton({ icon: Icon, label, onClick, disabled, active }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'flex size-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30',
            active && 'bg-blue-600/20 text-blue-400',
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  )
}
