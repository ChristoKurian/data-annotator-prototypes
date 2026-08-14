import { Play, Pause } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { TOTAL_FRAMES, FRAME_RATE } from './mockData'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function BottomBar({ frame, onFrameChange, playing, onTogglePlay, onSubmit }) {
  const elapsed = formatTime((frame - 1) / FRAME_RATE)
  const total = formatTime(TOTAL_FRAMES / FRAME_RATE)

  return (
    <footer className="flex h-14 shrink-0 items-center gap-4 border-t border-white/10 bg-zinc-950 px-4">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span>Frame</span>
        <input
          type="number"
          min={1}
          max={TOTAL_FRAMES}
          value={frame}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (Number.isFinite(v)) onFrameChange(Math.min(TOTAL_FRAMES, Math.max(1, v)))
          }}
          className="w-14 rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-center font-mono text-sm text-zinc-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <span>of {TOTAL_FRAMES}</span>
      </div>

      <button
        onClick={onTogglePlay}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
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

      <div className="rounded-md bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-300">
        {elapsed} / {total}
      </div>

      <Button onClick={onSubmit} className="bg-blue-600 text-white hover:bg-blue-500">
        Submit Task
      </Button>
    </footer>
  )
}
