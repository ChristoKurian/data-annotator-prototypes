import { ZoomIn, ZoomOut, Maximize, Sun, Contrast, Eye, EyeOff, Keyboard, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function LeftRail({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  brightUp,
  onBrightUp,
  contrastUp,
  onContrastUp,
  visible,
  onToggleVisible,
}) {
  return (
    <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-zinc-950 py-2">
      <RailButton icon={ZoomIn} label="Zoom in" onClick={onZoomIn} />
      <RailButton icon={ZoomOut} label="Zoom out" onClick={onZoomOut} />
      <RailButton icon={Maximize} label="Fit to screen" onClick={onResetZoom} />
      <div className="my-1 h-px w-6 bg-white/10" />
      <RailButton icon={Sun} label="Brightness" active={brightUp} onClick={onBrightUp} />
      <RailButton icon={Contrast} label="Contrast" active={contrastUp} onClick={onContrastUp} />
      <RailButton icon={visible ? Eye : EyeOff} label="Toggle visibility" active={!visible} onClick={onToggleVisible} />
      <div className="my-1 h-px w-6 bg-white/10" />
      <RailButton icon={Keyboard} label="Keyboard shortcuts" />
      <RailButton icon={Info} label="Info" />
    </aside>
  )
}

function RailButton({ icon: Icon, label, onClick, active }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex size-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100',
            active && 'bg-blue-600/20 text-blue-400',
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
