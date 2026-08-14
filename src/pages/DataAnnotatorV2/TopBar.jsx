import { Square, Slash, Hexagon, MapPin, Box, Wand2, ChevronDown, Eye, EyeOff, LogOut, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TOOLS } from './mockData'

const TOOL_ICONS = {
  box: Square,
  line: Slash,
  polygon: Hexagon,
  landmark: MapPin,
  cuboid: Box,
  auto: Wand2,
}

const ALL_TOOLS = [...TOOLS, { id: 'auto', label: 'Auto Label', shortcut: '6' }]

export default function TopBar({
  tool,
  onSelectTool,
  labels,
  activeLabelId,
  onSelectLabel,
  autoLabelMode,
  autoLabelSelectedIds,
  onToggleAutoLabelSelection,
  labelVisibility,
  onToggleLabelVisibility,
  exitHref,
}) {
  const ToolIcon = TOOL_ICONS[tool] ?? Square
  const toolLabel = ALL_TOOLS.find((t) => t.id === tool)?.label ?? 'Box'

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-zinc-950 px-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800">
            <ToolIcon className="size-3.5" />
            <span className="whitespace-nowrap">{toolLabel}</span>
            <ChevronDown className="size-3.5 text-zinc-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {ALL_TOOLS.map((t) => {
            const Icon = TOOL_ICONS[t.id]
            return (
              <DropdownMenuItem key={t.id} onClick={() => onSelectTool(t.id)} className="gap-2">
                <Icon className="size-3.5" />
                {t.label}
                {tool === t.id && <Check className="ml-auto size-3.5" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-5 w-px bg-white/10" />

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 [scrollbar-width:thin]">
        {labels.map((label) => {
          const disabled = autoLabelMode && !label.aiAvailable
          const isActive = autoLabelMode
            ? autoLabelSelectedIds.has(label.id)
            : activeLabelId === label.id
          const visible = labelVisibility.has(label.id)

          const pill = (
            <div
              key={label.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-disabled={disabled}
              onClick={() => {
                if (disabled) return
                if (autoLabelMode) onToggleAutoLabelSelection(label.id)
                else onSelectLabel(label.id)
              }}
              className={cn(
                'flex shrink-0 select-none items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition',
                disabled
                  ? 'cursor-not-allowed border-transparent text-zinc-600'
                  : isActive
                    ? 'cursor-pointer border-blue-500/40 bg-blue-500/15 text-blue-400'
                    : 'cursor-pointer border-transparent text-zinc-300 hover:bg-zinc-800',
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!disabled) onToggleLabelVisibility(label.id)
                }}
                className={cn(
                  'flex items-center justify-center',
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                  !disabled && !visible && 'opacity-50',
                )}
              >
                {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </button>
              {label.name}
            </div>
          )

          if (!disabled) return pill

          return (
            <Tooltip key={label.id}>
              <TooltipTrigger asChild>{pill}</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56">
                <p className="font-medium">Auto Label Unavailable</p>
                <p className="text-muted-foreground">Update relevant datasets to avail auto-annotation</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      <a
        href={exitHref}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
      >
        <LogOut className="size-3.5" /> Exit
      </a>
    </header>
  )
}
