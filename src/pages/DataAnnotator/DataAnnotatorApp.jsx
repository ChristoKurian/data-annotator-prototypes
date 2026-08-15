import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import { saveResult, summarizeAnnotations } from '@/lib/results'
import TopBar from './TopBar'
import LeftRail from './LeftRail'
import CanvasStage from './CanvasStage'
import RightPanel from './RightPanel'
import BottomBar from './BottomBar'
import { ANNOTATION_COLORS, AUTO_LABEL_SUGGESTIONS, FRAME_RATE, TOTAL_FRAMES, randomId } from './mockData'

function nextColor(count) {
  return ANNOTATION_COLORS[count % ANNOTATION_COLORS.length]
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`
}

function formatAvgDuration(ms) {
  return `${Math.max(0, ms / 1000).toFixed(1)}s`
}

export default function DataAnnotatorApp() {
  const [started, setStarted] = useState(false)
  const [submission, setSubmission] = useState(null)

  const [activeTool, setActiveTool] = useState('box')
  const [annotations, setAnnotations] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  const [autoLabelMode, setAutoLabelMode] = useState(false)
  const [confidence, setConfidence] = useState(50)

  const [showLabels, setShowLabels] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [viewByGroup, setViewByGroup] = useState('Id')
  const [annotationDetails, setAnnotationDetails] = useState(true)
  const [objectsInCurrentFrame, setObjectsInCurrentFrame] = useState(true)

  const [frame, setFrame] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [brightUp, setBrightUp] = useState(false)
  const [contrastUp, setContrastUp] = useState(false)

  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const [toast, setToast] = useState(null)

  const taskStartRef = useRef(null)

  useEffect(() => {
    track('annotator_opened')
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const handleStart = () => {
    taskStartRef.current = Date.now()
    setStarted(true)
    track('task_started')
  }

  const handleTogglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play()
    else v.pause()
  }

  const handleVideoTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    setFrame(Math.min(TOTAL_FRAMES, Math.floor(v.currentTime * FRAME_RATE) + 1))
  }

  const handleFrameChange = (next) => {
    setFrame(next)
    const v = videoRef.current
    if (v) v.currentTime = (next - 1) / FRAME_RATE
  }

  const handleZoomIn = () => {
    setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(2)))
    track('canvas_zoom', { direction: 'in', method: 'button' })
  }

  const handleZoomOut = () => {
    setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))
    track('canvas_zoom', { direction: 'out', method: 'button' })
  }

  const handleResetZoom = () => {
    setZoom(1)
    track('canvas_zoom', { direction: 'reset', method: 'button' })
  }

  const handleSelectTool = (toolId) => {
    setSelectedId(null)
    setActiveTool((cur) => (cur === toolId ? null : toolId))
    if (toolId) track('tool_changed', { tool: toolId })
  }

  const handleCreateAnnotation = (partial) => {
    const id = randomId()
    const annotation = {
      id,
      label: 'Car',
      color: nextColor(annotations.length),
      frames: 1,
      tracking: true,
      occlusion: null,
      ...partial,
    }
    setAnnotations((prev) => [...prev, annotation])
    setSelectedId(id)
    track('annotation_created', { type: annotation.type, label: annotation.label, annotation_count: annotations.length + 1 })
  }

  const handleUpdateAnnotation = (id, patch) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const handleDeleteAnnotation = (id) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
    setSelectedId(null)
    track('annotation_deleted')
  }

  const visibleSuggestions = AUTO_LABEL_SUGGESTIONS.filter((s) => s.confidence >= confidence)

  const handleAcceptAutoLabel = () => {
    setAnnotations((prev) => [
      ...prev,
      ...visibleSuggestions.map((s, i) => ({
        id: randomId(),
        type: 'box',
        label: capitalize(s.label),
        color: nextColor(prev.length + i),
        box: s.box,
        frames: 1,
        tracking: true,
        occlusion: null,
      })),
    ])
    setAutoLabelMode(false)
    setConfidence(50)
    setToast(`Added ${visibleSuggestions.length} auto-labeled annotation${visibleSuggestions.length === 1 ? '' : 's'}`)
    track('auto_label_accepted', { count: visibleSuggestions.length, confidence })
  }

  const handleRejectAutoLabel = () => {
    setAutoLabelMode(false)
    setConfidence(50)
    track('auto_label_rejected')
  }

  const handleSubmit = () => {
    if (submission) return
    const duration_ms = Date.now() - (taskStartRef.current ?? Date.now())
    const summary = summarizeAnnotations(annotations, duration_ms)
    saveResult('v1', summary)
    setSubmission(summary)
    track('task_submitted', {
      duration_ms,
      annotation_count: annotations.length,
    })
  }

  const filterCss = `brightness(${brightUp ? 1.18 : 1}) contrast(${contrastUp ? 1.18 : 1})`

  if (!started) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-lg font-medium text-zinc-200">Annotate as many cars, bikes, and buses as you can</h1>
          <p className="text-sm text-zinc-500">Draw a shape, then pick its label from the search popup.</p>
        </div>
        <Button size="lg" onClick={handleStart} className="bg-blue-600 px-8 text-white hover:bg-blue-500">
          Start
        </Button>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        className={cn(
          'flex h-full w-full flex-col transition-all duration-300',
          submission && 'pointer-events-none opacity-40 grayscale',
        )}
        inert={submission ? true : undefined}
      >
        <TopBar
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          autoLabelMode={autoLabelMode}
          onToggleAutoLabel={() => {
            setSelectedId(null)
            setAutoLabelMode(true)
            track('auto_label_opened')
          }}
          confidence={confidence}
          onConfidenceChange={setConfidence}
          onAcceptAutoLabel={handleAcceptAutoLabel}
          onRejectAutoLabel={handleRejectAutoLabel}
          showLabels={showLabels}
          onToggleLabels={setShowLabels}
          showAnnotations={showAnnotations}
          onToggleAnnotations={setShowAnnotations}
          exitHref="/"
        />

        <div className="flex min-h-0 flex-1">
          <LeftRail
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            brightUp={brightUp}
            onBrightUp={() => setBrightUp((v) => !v)}
            contrastUp={contrastUp}
            onContrastUp={() => setContrastUp((v) => !v)}
            visible={showAnnotations}
            onToggleVisible={() => setShowAnnotations((v) => !v)}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              <CanvasStage
                annotations={annotations}
                suggestions={visibleSuggestions}
                activeTool={activeTool}
                onCreateAnnotation={handleCreateAnnotation}
                selectedId={selectedId}
                onSelect={setSelectedId}
                showAnnotations={showAnnotations}
                showLabels={showLabels}
                autoLabelMode={autoLabelMode}
                zoom={zoom}
                filterCss={filterCss}
                videoRef={videoRef}
                onVideoTimeUpdate={handleVideoTimeUpdate}
                onVideoPlay={() => setPlaying(true)}
                onVideoPause={() => setPlaying(false)}
                onVideoEnded={() => setPlaying(false)}
              />
            </div>
            <BottomBar
              frame={frame}
              onFrameChange={handleFrameChange}
              onSubmit={handleSubmit}
              playing={playing}
              onTogglePlay={handleTogglePlay}
            />
          </div>

          <RightPanel
            annotations={annotations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDeselect={() => setSelectedId(null)}
            onUpdateAnnotation={handleUpdateAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            viewByGroup={viewByGroup}
            onViewByGroupChange={setViewByGroup}
            annotationDetails={annotationDetails}
            onToggleAnnotationDetails={setAnnotationDetails}
            objectsInCurrentFrame={objectsInCurrentFrame}
            onToggleObjectsInCurrentFrame={setObjectsInCurrentFrame}
            autoLabelMode={autoLabelMode}
            visibleSuggestions={visibleSuggestions}
          />
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/95 px-4 py-2 text-sm text-zinc-100 shadow-xl">
          {toast}
        </div>
      )}

      {submission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
          <div className="flex w-[min(90vw,360px)] flex-col items-center gap-4 rounded-xl border border-white/10 bg-zinc-900 px-8 py-7 text-center shadow-2xl">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="size-5" />
            </div>
            <div className="text-base font-medium text-zinc-100">Activity completed</div>

            <div className="grid w-full grid-cols-2 gap-2 text-left">
              <div className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2">
                <div className="text-[10px] tracking-wide text-zinc-500 uppercase">Total time</div>
                <div className="text-sm font-medium text-zinc-100">{formatDuration(submission.durationMs)}</div>
              </div>
              <div className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2">
                <div className="text-[10px] tracking-wide text-zinc-500 uppercase">Avg / annotation</div>
                <div className="text-sm font-medium text-zinc-100">
                  {submission.count > 0 ? formatAvgDuration(submission.avgMs) : '—'}
                </div>
              </div>
            </div>

            {submission.count > 0 && (
              <div className="w-full text-left">
                <div className="mb-1.5 text-[10px] tracking-wide text-zinc-500 uppercase">
                  Annotations by label ({submission.count})
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-zinc-950 p-2">
                  {Object.entries(submission.perLabel)
                    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                    .map(([label, count]) => (
                      <div key={label} className="flex items-center justify-between text-xs text-zinc-300">
                        <span>{label}</span>
                        <span className="font-mono text-zinc-500">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <Button asChild className="w-full bg-blue-600 text-white hover:bg-blue-500">
              <a href="/v2.html">Try the V2 flow</a>
            </Button>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}
