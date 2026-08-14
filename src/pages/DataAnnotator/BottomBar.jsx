import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { TOTAL_FRAMES } from './mockData'

export default function BottomBar({ frame, onFrameChange, onSubmit, playing, onTogglePlay }) {
  return (
    <footer className="flex h-14 shrink-0 items-center gap-3 border-t border-white/10 bg-zinc-950 px-4">
      <button
        onClick={onTogglePlay}
        className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>

      <button
        onClick={() => onFrameChange(Math.max(1, frame - 1))}
        className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30"
        disabled={frame <= 1}
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex-1">
        <Slider
          value={[frame]}
          min={1}
          max={TOTAL_FRAMES}
          step={1}
          onValueChange={(v) => onFrameChange(v[0])}
        />
      </div>

      <button
        onClick={() => onFrameChange(Math.min(TOTAL_FRAMES, frame + 1))}
        className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30"
        disabled={frame >= TOTAL_FRAMES}
      >
        <ChevronRight className="size-4" />
      </button>

      <div className="rounded-md bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-300">
        {frame}/{TOTAL_FRAMES}
      </div>

      <Button onClick={onSubmit} className="bg-blue-600 text-white hover:bg-blue-500">
        Submit Task
      </Button>
    </footer>
  )
}
