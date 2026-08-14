import { Wand2, Square, Slash, Hexagon, MapPin, Box, Check, X, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TOOLS } from './mockData'

const TOOL_ICONS = {
  box: Square,
  line: Slash,
  polygon: Hexagon,
  landmark: MapPin,
  cuboid: Box,
}

export default function TopBar({
  activeTool,
  onSelectTool,
  autoLabelMode,
  onToggleAutoLabel,
  confidence,
  onConfidenceChange,
  onAcceptAutoLabel,
  onRejectAutoLabel,
  showLabels,
  onToggleLabels,
  showAnnotations,
  onToggleAnnotations,
  exitHref,
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950 px-3">
      {autoLabelMode ? (
        <div className="flex flex-1 items-center gap-4">
          <span className="text-xs font-medium text-zinc-400">More Labels</span>
          <div className="flex w-56 flex-col">
            <Slider
              value={[confidence]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => onConfidenceChange(v[0])}
              className="[&_[data-slot=slider-track]]:bg-zinc-700"
            />
          </div>
          <span className="text-xs font-medium text-zinc-400">Less Labels</span>
          <div className="ml-2 flex items-center gap-1 text-[11px] text-zinc-500">
            <span>Confidence Score</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-200">{confidence}%</span>
          </div>

          <div className="ml-4 h-5 w-px bg-white/10" />

          <span className="text-xs text-zinc-400">Accept Auto Label?</span>
          <button
            onClick={onAcceptAutoLabel}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
          >
            <Check className="size-3.5" /> Yes
          </button>
          <button
            onClick={onRejectAutoLabel}
            className="flex items-center gap-1.5 rounded-md bg-red-600/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
          >
            <X className="size-3.5" /> No
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-1">
          <ToolButton
            label="Auto Label"
            icon={Wand2}
            active={false}
            onClick={onToggleAutoLabel}
            className="mr-2 border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          />
          <div className="mr-1 h-5 w-px bg-white/10" />
          {TOOLS.map((tool) => (
            <ToolButton
              key={tool.id}
              label={tool.label}
              icon={TOOL_ICONS[tool.id]}
              shortcut={tool.shortcut}
              active={activeTool === tool.id}
              onClick={() => onSelectTool(tool.id)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <Checkbox checked={showLabels} onCheckedChange={onToggleLabels} disabled={autoLabelMode} />
          Labels
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <Checkbox checked={showAnnotations} onCheckedChange={onToggleAnnotations} disabled={autoLabelMode} />
          Annotations
        </label>
        <a
          href={exitHref}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
        >
          <LogOut className="size-3.5" /> Exit
        </a>
      </div>
    </header>
  )
}

function ToolButton({ label, icon: Icon, shortcut, active, onClick, className }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition',
            active ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800',
            className,
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      </TooltipTrigger>
      {shortcut && (
        <TooltipContent side="bottom" className="flex items-center gap-1.5">
          Shortcut <kbd className="rounded bg-zinc-700 px-1.5 py-0.5 font-mono text-[10px]">{shortcut}</kbd>
        </TooltipContent>
      )}
    </Tooltip>
  )
}
