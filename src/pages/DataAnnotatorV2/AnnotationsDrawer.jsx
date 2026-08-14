import { ArrowLeft, ChevronsRight, Square, Slash, Hexagon, MapPin, Box, Pencil, Copy, ChevronDown, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LABEL_OPTIONS, OCCLUSION_OPTIONS } from './mockData'

const TYPE_ICONS = { box: Square, cuboid: Box, polygon: Hexagon, line: Slash, landmark: MapPin }

export default function AnnotationsDrawer({
  open,
  onOpenChange,
  annotations,
  selectedId,
  onSelect,
  onDeselect,
  onUpdateAnnotation,
  onDeleteAnnotation,
}) {
  const selected = annotations.find((a) => a.id === selectedId)

  return (
    <>
      {/* Always-present tab — the canvas column's width never changes,
          whether the panel below is open or closed. */}
      <button
        onClick={() => onOpenChange(!open)}
        className="z-10 flex w-10 shrink-0 flex-col items-center gap-3 border-r border-white/10 bg-zinc-950 py-4 text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
      >
        <ChevronsRight className={cn('size-4 transition-transform', open && 'rotate-180')} />
        <span className="flex min-w-5 items-center justify-center rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-100">
          {annotations.length}
        </span>
        <span className="[writing-mode:vertical-rl] text-xs font-medium tracking-wide">View Annotations</span>
      </button>

      {open && (
        <aside className="absolute inset-y-0 left-10 z-20 flex w-72 flex-col border-r border-white/10 bg-zinc-950 shadow-2xl shadow-black/60">
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-medium text-zinc-400 transition hover:text-zinc-100"
          >
            <ChevronsRight className="size-3.5 rotate-180" /> Collapse
          </button>

          {selected ? (
            <DetailPanel
              annotation={selected}
              index={annotations.indexOf(selected)}
              total={annotations.length}
              onBack={onDeselect}
              onUpdate={(patch) => onUpdateAnnotation(selected.id, patch)}
              onDelete={() => onDeleteAnnotation(selected.id)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className="text-sm font-semibold text-zinc-100">List of Annotations</span>
                <span className="text-xs text-zinc-500">{annotations.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {annotations.length === 0 && (
                  <div className="mx-2 mt-6 rounded-md border border-dashed border-white/10 p-4 text-center text-xs leading-relaxed text-zinc-500">
                    No annotations found in the current frame.
                    <br />
                    Pick a label above, then draw on the image to get started.
                  </div>
                )}

                {annotations.map((a) => (
                  <ListRow key={a.id} annotation={a} onClick={() => onSelect(a.id)} />
                ))}
              </div>
            </>
          )}
        </aside>
      )}
    </>
  )
}

function ListRow({ annotation, onClick }) {
  const Icon = TYPE_ICONS[annotation.type] ?? Square
  return (
    <button
      onClick={onClick}
      className="flex w-full items-stretch gap-3 rounded-md px-2 py-2 text-left transition hover:bg-zinc-900"
    >
      <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: annotation.color }} />
      <div className="flex flex-1 flex-col">
        <span className="flex items-center gap-1.5 text-sm text-zinc-100">
          <Icon className="size-3.5" style={{ color: annotation.color }} />
          {annotation.label}
        </span>
        <span className="text-xs text-zinc-500">{annotation.frames}</span>
      </div>
    </button>
  )
}

function DetailPanel({ annotation, index, total, onBack, onUpdate, onDelete }) {
  const Icon = TYPE_ICONS[annotation.type] ?? Square
  const specs = getSpecs(annotation)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="h-0.5 w-full bg-blue-500" />
      <div className="flex items-center justify-between px-4 pt-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-zinc-100">
          <ArrowLeft className="size-4" />
          <Icon className="size-4" style={{ color: annotation.color }} />
          {annotation.label}
        </button>
        <span className="font-mono text-xs text-zinc-500">
          {index + 1}/{total}
        </span>
      </div>

      <div className="space-y-4 p-4">
        <Select value={annotation.label} onValueChange={(v) => onUpdate({ label: v })}>
          <SelectTrigger className="w-full border-white/10 bg-zinc-900 text-zinc-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LABEL_OPTIONS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 truncate rounded-md border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-400">
            <span className="truncate">{annotation.id}</span>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(annotation.id)}
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-500"
          >
            <Copy className="size-4" />
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <Checkbox checked disabled />
          Frames: {annotation.frames}
        </label>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-1 items-center justify-between rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800">
                Delete Annotation
                <ChevronDown className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onDelete}>Delete this frame</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} variant="destructive">
                Delete all frames
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => onUpdate({ tracking: !annotation.tracking })}
            className="rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800"
          >
            {annotation.tracking ? 'Pause Tracking' : 'Resume Tracking'}
          </button>
        </div>

        {specs && (
          <div>
            <span className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-200">
              <Ruler className="size-3.5" /> Specifications
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-zinc-900 p-3">
              <div>
                <div className="text-xs text-zinc-500">Height</div>
                <div className="font-mono text-sm text-zinc-100">{specs.height}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Width</div>
                <div className="font-mono text-sm text-zinc-100">{specs.width}</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <span className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-200">
            <Pencil className="size-3.5" /> List of Attributes
          </span>
          <div className="space-y-2 rounded-md border border-white/10 bg-zinc-900 p-3">
            <span className="text-xs text-zinc-500">Occlusion</span>
            <div className="flex flex-wrap gap-2">
              {OCCLUSION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onUpdate({ occlusion: annotation.occlusion === opt ? null : opt })}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition',
                    annotation.occlusion === opt
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-white/10 bg-zinc-950 text-zinc-300 hover:bg-zinc-800',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getSpecs(annotation) {
  const IMAGE_WIDTH = 1920
  const IMAGE_HEIGHT = 1080
  if (annotation.type === 'box' || annotation.type === 'cuboid') {
    return {
      height: ((annotation.box.h / 100) * IMAGE_HEIGHT).toFixed(2),
      width: ((annotation.box.w / 100) * IMAGE_WIDTH).toFixed(2),
    }
  }
  if (annotation.type === 'polygon' || annotation.type === 'line') {
    const xs = annotation.points.map((p) => p.x)
    const ys = annotation.points.map((p) => p.y)
    const w = Math.max(...xs) - Math.min(...xs)
    const h = Math.max(...ys) - Math.min(...ys)
    return {
      height: ((h / 100) * IMAGE_HEIGHT).toFixed(2),
      width: ((w / 100) * IMAGE_WIDTH).toFixed(2),
    }
  }
  return null
}
