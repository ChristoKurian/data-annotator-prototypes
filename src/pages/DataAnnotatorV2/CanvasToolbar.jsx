import { Undo2, Redo2, Move, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function CanvasToolbar({
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  panMode,
  onTogglePan,
  onZoomIn,
  onZoomOut,
  zoom,
}) {
  return (
    <div className="absolute top-4 right-4 flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 p-1.5 shadow-2xl shadow-black/60">
      <IconButton icon={Undo2} label="Undo" onClick={onUndo} disabled={!canUndo} />
      <IconButton icon={Redo2} label="Redo" onClick={onRedo} disabled={!canRedo} />
      <div className="my-0.5 h-px w-6 bg-white/10" />
      <IconButton icon={Move} label="Pan" onClick={onTogglePan} active={panMode} />
      <IconButton icon={Plus} label="Zoom in" onClick={onZoomIn} disabled={zoom >= 2.5} />
      <div className="flex h-16 items-center py-1">
        <div className="relative h-full w-1 rounded-full bg-zinc-700">
          <div
            className="absolute bottom-0 w-full rounded-full bg-zinc-500"
            style={{ height: `${((zoom - 1) / 1.5) * 100}%` }}
          />
        </div>
      </div>
      <IconButton icon={Minus} label="Zoom out" onClick={onZoomOut} disabled={zoom <= 1} />
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
