import { useEffect, useRef, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { track } from '@/lib/analytics'
import TopBar from './TopBar'
import CanvasToolbar from './CanvasToolbar'
import CanvasStage from './CanvasStage'
import AnnotationsDrawer from './AnnotationsDrawer'
import BottomBar from './BottomBar'
import { LABELS, LABEL_COLORS, AUTO_LABEL_SUGGESTIONS, FRAME_RATE, TOTAL_FRAMES, randomId, labelIdByName } from './mockData'

export default function DataAnnotatorApp() {
  const [tool, setTool] = useState('box')
  const [lastShapeTool, setLastShapeTool] = useState('box')
  const [activeLabelId, setActiveLabelId] = useState(LABELS[0].id)
  const [labelVisibility, setLabelVisibility] = useState(() => new Set(LABELS.map((l) => l.id)))

  const [annotations, setAnnotations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])

  const [autoLabelSelectedIds, setAutoLabelSelectedIds] = useState(() => new Set())
  const [confidence, setConfidence] = useState(60)
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState(() => new Set())

  const [frame, setFrame] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [panMode, setPanMode] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })

  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const [toast, setToast] = useState(null)

  const autoLabelMode = tool === 'auto'

  const taskStartRef = useRef(Date.now())

  useEffect(() => {
    track('annotator_opened')
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // Entering Auto Label pre-selects every label that has a trained model.
  useEffect(() => {
    if (autoLabelMode && autoLabelSelectedIds.size === 0) {
      setAutoLabelSelectedIds(new Set(LABELS.filter((l) => l.aiAvailable).map((l) => l.id)))
    }
  }, [autoLabelMode]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const pushHistory = (snapshot) => {
    setHistory((h) => [...h.slice(-19), snapshot])
    setFuture([])
  }

  const handleSelectTool = (id) => {
    setSelectedId(null)
    if (id === 'auto') {
      setPanMode(false)
      track('auto_label_opened')
    } else {
      setLastShapeTool(id)
      setDismissedSuggestionIds(new Set())
      setAutoLabelSelectedIds(new Set())
    }
    setTool(id)
    track('tool_changed', { tool: id })
  }

  const handleCreateAnnotation = (partial) => {
    if (!activeLabelId) return
    const label = LABELS.find((l) => l.id === activeLabelId)
    pushHistory(annotations)
    const id = randomId()
    const annotation = {
      id,
      label: label.name,
      labelId: label.id,
      color: LABEL_COLORS[label.id],
      frames: 1,
      tracking: true,
      occlusion: null,
      ...partial,
    }
    setAnnotations((prev) => [...prev, annotation])
    setSelectedId(id)
    // Annotating on a label focuses the canvas on just that layer — any
    // other layer the user wants to see again has to be switched back on
    // by hand, one at a time.
    setLabelVisibility(new Set([label.id]))
    track('annotation_created', { type: annotation.type, label: annotation.label, annotation_count: annotations.length + 1 })
  }

  const handleUpdateAnnotation = (id, patch) => {
    pushHistory(annotations)
    setAnnotations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a
        const next = { ...a, ...patch }
        if (patch.label) {
          const labelId = labelIdByName(patch.label)
          next.labelId = labelId
          next.color = LABEL_COLORS[labelId]
        }
        return next
      }),
    )
  }

  const handleDeleteAnnotation = (id) => {
    pushHistory(annotations)
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
    setSelectedId(null)
    track('annotation_deleted')
  }

  const handleUndo = () => {
    if (history.length === 0) return
    setFuture((f) => [annotations, ...f])
    setAnnotations(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
    setSelectedId(null)
  }

  const handleRedo = () => {
    if (future.length === 0) return
    setHistory((h) => [...h, annotations])
    setAnnotations(future[0])
    setFuture((f) => f.slice(1))
    setSelectedId(null)
  }

  const visibleSuggestions = AUTO_LABEL_SUGGESTIONS.filter(
    (s) =>
      s.confidence >= confidence &&
      autoLabelSelectedIds.has(labelIdByName(s.label)) &&
      !dismissedSuggestionIds.has(s.id),
  )

  const handleAcceptAutoLabel = () => {
    pushHistory(annotations)
    setAnnotations((prev) => [
      ...prev,
      ...visibleSuggestions.map((s) => {
        const labelId = labelIdByName(s.label)
        return {
          id: randomId(),
          type: 'box',
          label: s.label,
          labelId,
          color: LABEL_COLORS[labelId],
          box: s.box,
          frames: 1,
          tracking: true,
          occlusion: null,
        }
      }),
    ])
    setToast(`Added ${visibleSuggestions.length} auto-labeled annotation${visibleSuggestions.length === 1 ? '' : 's'}`)
    setTool(lastShapeTool)
    setConfidence(60)
    setDismissedSuggestionIds(new Set())
    setAutoLabelSelectedIds(new Set())
    track('auto_label_accepted', { count: visibleSuggestions.length, confidence })
  }

  const handleRejectAutoLabel = () => {
    setTool(lastShapeTool)
    setConfidence(60)
    setDismissedSuggestionIds(new Set())
    setAutoLabelSelectedIds(new Set())
    track('auto_label_rejected')
  }

  const handleSubmit = () => {
    setToast('Task submitted')
    track('task_submitted', {
      duration_ms: Date.now() - taskStartRef.current,
      annotation_count: annotations.length,
    })
  }

  const handleToggleLabelVisibility = (id) => {
    setLabelVisibility((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleAutoLabelSelection = (id) => {
    setAutoLabelSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeLabel = LABELS.find((l) => l.id === activeLabelId) ?? null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
        <TopBar
          tool={tool}
          onSelectTool={handleSelectTool}
          labels={LABELS}
          activeLabelId={activeLabelId}
          onSelectLabel={setActiveLabelId}
          autoLabelMode={autoLabelMode}
          autoLabelSelectedIds={autoLabelSelectedIds}
          onToggleAutoLabelSelection={handleToggleAutoLabelSelection}
          labelVisibility={labelVisibility}
          onToggleLabelVisibility={handleToggleLabelVisibility}
          exitHref="/"
          onSubmit={handleSubmit}
        />

        <div className="relative flex min-h-0 flex-1">
          <AnnotationsDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            annotations={annotations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDeselect={() => setSelectedId(null)}
            onUpdateAnnotation={handleUpdateAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <CanvasStage
                annotations={annotations}
                labelVisibility={labelVisibility}
                tool={tool}
                activeLabel={activeLabel}
                onCreateAnnotation={handleCreateAnnotation}
                selectedId={selectedId}
                onSelect={setSelectedId}
                autoLabelMode={autoLabelMode}
                suggestions={visibleSuggestions}
                confidence={confidence}
                onConfidenceChange={setConfidence}
                onAcceptAutoLabel={handleAcceptAutoLabel}
                onRejectAutoLabel={handleRejectAutoLabel}
                onDismissSuggestion={(id) => setDismissedSuggestionIds((prev) => new Set(prev).add(id))}
                zoom={zoom}
                panMode={panMode}
                panOffset={panOffset}
                onPanOffsetChange={setPanOffset}
                videoRef={videoRef}
                onVideoTimeUpdate={handleVideoTimeUpdate}
                onVideoPlay={() => setPlaying(true)}
                onVideoPause={() => setPlaying(false)}
                onVideoEnded={() => setPlaying(false)}
              />
              <CanvasToolbar
                onUndo={handleUndo}
                canUndo={history.length > 0}
                onRedo={handleRedo}
                canRedo={future.length > 0}
                panMode={panMode}
                onTogglePan={() => setPanMode((v) => !v)}
                onZoomIn={() => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(2)))}
                onZoomOut={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
                zoom={zoom}
              />
            </div>
            <BottomBar frame={frame} onFrameChange={handleFrameChange} playing={playing} onTogglePlay={handleTogglePlay} />
          </div>
        </div>

        {toast && (
          <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/95 px-4 py-2 text-sm text-zinc-100 shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
