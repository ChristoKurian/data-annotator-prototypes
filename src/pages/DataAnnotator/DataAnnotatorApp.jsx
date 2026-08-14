import { useEffect, useRef, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { track } from '@/lib/analytics'
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

export default function DataAnnotatorApp() {
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

  const taskStartRef = useRef(Date.now())

  useEffect(() => {
    track('annotator_opened')
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

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
    setToast('Task submitted')
    track('task_submitted', {
      duration_ms: Date.now() - taskStartRef.current,
      annotation_count: annotations.length,
    })
  }

  const filterCss = `brightness(${brightUp ? 1.18 : 1}) contrast(${contrastUp ? 1.18 : 1})`

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
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
            onZoomIn={() => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(2)))}
            onZoomOut={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
            onResetZoom={() => setZoom(1)}
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

        {toast && (
          <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/95 px-4 py-2 text-sm text-zinc-100 shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
