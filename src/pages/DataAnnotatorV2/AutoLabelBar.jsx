import { useEffect, useRef, useState } from 'react'
import { GripVertical, Check, X } from 'lucide-react'
import { Slider } from '@/components/ui/slider'

export default function AutoLabelBar({ confidence, onConfidenceChange, onAccept, onReject }) {
  const [pos, setPos] = useState({ x: 24, y: 16 })
  const dragRef = useRef(null)

  useEffect(() => {
    const el = dragRef.current
    if (!el) return

    let start = null

    const onMove = (e) => {
      if (!start) return
      setPos({ x: start.posX + (e.clientX - start.x), y: start.posY + (e.clientY - start.y) })
    }
    const onUp = () => {
      start = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    const onDown = (e) => {
      start = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }

    el.addEventListener('mousedown', onDown)
    return () => el.removeEventListener('mousedown', onDown)
  }, [pos])

  return (
    <div
      className="absolute z-10 flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 shadow-2xl shadow-black/60"
      style={{ left: pos.x, top: pos.y }}
    >
      <div ref={dragRef} className="cursor-grab text-zinc-600 active:cursor-grabbing">
        <GripVertical className="size-4" />
      </div>

      <span className="text-xs font-medium whitespace-nowrap text-zinc-400">Low Accuracy</span>
      <div className="w-40">
        <Slider value={[confidence]} min={0} max={100} step={1} onValueChange={(v) => onConfidenceChange(v[0])} />
      </div>
      <span className="text-xs font-medium whitespace-nowrap text-zinc-400">High Accuracy</span>
      <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-200">{confidence}%</span>

      <div className="mx-1 h-5 w-px bg-white/10" />

      <span className="text-xs text-zinc-400">Accept?</span>
      <button
        onClick={onAccept}
        className="flex size-6 items-center justify-center rounded-md bg-emerald-600/90 text-white transition hover:bg-emerald-500"
      >
        <Check className="size-4" />
      </button>
      <button
        onClick={onReject}
        className="flex size-6 items-center justify-center rounded-md bg-red-600/90 text-white transition hover:bg-red-500"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
