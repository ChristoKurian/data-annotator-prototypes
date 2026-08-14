import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContainRect } from './useContainRect'
import { VIDEO_SIZE, VIDEO_SRC } from './mockData'
import AutoLabelBar from './AutoLabelBar'

const MIN_BOX_SIZE = 1.2 // percent
const CLOSE_RADIUS = 2.2 // percent, distance to first point that closes a polygon
const ZOOM_MIN = 1
const ZOOM_MAX = 2.5
const WHEEL_ZOOM_SENSITIVITY = 0.0025

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export default function CanvasStage({
  annotations,
  labelVisibility,
  tool,
  activeLabel,
  onCreateAnnotation,
  selectedId,
  onSelect,
  autoLabelMode,
  suggestions,
  confidence,
  onConfidenceChange,
  onAcceptAutoLabel,
  onRejectAutoLabel,
  onDismissSuggestion,
  zoom,
  onZoomChange,
  panMode,
  panOffset,
  onPanOffsetChange,
  videoRef,
  onVideoTimeUpdate,
  onVideoPlay,
  onVideoPause,
  onVideoEnded,
}) {
  const { containerRef, rect: baseRect } = useContainRect(VIDEO_SIZE)
  const svgRef = useRef(null)

  // Trackpad pinch/scroll and mouse-wheel zoom. Kept off React's onWheel
  // (passive by default, so preventDefault silently no-ops) via a native
  // listener instead. zoomRef avoids re-binding the listener on every zoom
  // change.
  const zoomRef = useRef(zoom)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !onZoomChange) return
    const handleWheel = (e) => {
      e.preventDefault()
      onZoomChange(clamp(zoomRef.current - e.deltaY * WHEEL_ZOOM_SENSITIVITY, ZOOM_MIN, ZOOM_MAX))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [onZoomChange]) // eslint-disable-line react-hooks/exhaustive-deps

  const [draftBox, setDraftBox] = useState(null)
  const [draftPolygon, setDraftPolygon] = useState(null)
  const [draftLine, setDraftLine] = useState(null)
  const [hoverPos, setHoverPos] = useState(null)
  const [panDrag, setPanDrag] = useState(null)
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null)

  const rect = {
    x: baseRect.x - (baseRect.width * (zoom - 1)) / 2 + panOffset.x,
    y: baseRect.y - (baseRect.height * (zoom - 1)) / 2 + panOffset.y,
    width: baseRect.width * zoom,
    height: baseRect.height * zoom,
  }

  const toPercent = (clientX, clientY) => {
    const bounds = containerRef.current.getBoundingClientRect()
    const localX = clientX - bounds.left - rect.x
    const localY = clientY - bounds.top - rect.y
    return {
      x: clamp((localX / rect.width) * 100, 0, 100),
      y: clamp((localY / rect.height) * 100, 0, 100),
    }
  }

  const px = (xPercent) => (xPercent / 100) * rect.width
  const py = (yPercent) => (yPercent / 100) * rect.height

  const drawingDisabled = autoLabelMode || !tool || !activeLabel || panMode

  const handleMouseDown = (e) => {
    if (panMode) {
      setPanDrag({ startX: e.clientX, startY: e.clientY, originX: panOffset.x, originY: panOffset.y })
      return
    }
    if (drawingDisabled) return
    if (e.target.closest('[data-annotation-shape]')) return
    const p = toPercent(e.clientX, e.clientY)

    if (tool === 'box' || tool === 'cuboid') {
      setDraftBox({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
    } else if (tool === 'landmark') {
      onCreateAnnotation({ type: 'landmark', point: p })
    } else if (tool === 'line') {
      if (!draftLine) {
        setDraftLine({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
      } else {
        onCreateAnnotation({ type: 'line', points: [{ x: draftLine.x0, y: draftLine.y0 }, p] })
        setDraftLine(null)
      }
    } else if (tool === 'polygon') {
      if (!draftPolygon) {
        setDraftPolygon({ points: [p], cursor: p })
      } else {
        const first = draftPolygon.points[0]
        const dist = Math.hypot(p.x - first.x, p.y - first.y)
        if (draftPolygon.points.length >= 3 && dist < CLOSE_RADIUS) {
          onCreateAnnotation({ type: 'polygon', points: draftPolygon.points })
          setDraftPolygon(null)
        } else {
          setDraftPolygon({ points: [...draftPolygon.points, p], cursor: p })
        }
      }
    }
  }

  const handleMouseMove = (e) => {
    if (panDrag) {
      onPanOffsetChange({
        x: panDrag.originX + (e.clientX - panDrag.startX),
        y: panDrag.originY + (e.clientY - panDrag.startY),
      })
      return
    }
    if (drawingDisabled) {
      setHoverPos(null)
      return
    }
    const p = toPercent(e.clientX, e.clientY)
    setHoverPos(p)
    if (draftBox) setDraftBox((d) => ({ ...d, x1: p.x, y1: p.y }))
    if (draftPolygon) setDraftPolygon((d) => ({ ...d, cursor: p }))
    if (draftLine) setDraftLine((d) => ({ ...d, x1: p.x, y1: p.y }))
  }

  const handleMouseLeave = () => setHoverPos(null)

  const handleMouseUp = () => {
    if (panDrag) {
      setPanDrag(null)
      return
    }
    if (!draftBox) return
    const x = Math.min(draftBox.x0, draftBox.x1)
    const y = Math.min(draftBox.y0, draftBox.y1)
    const w = Math.abs(draftBox.x1 - draftBox.x0)
    const h = Math.abs(draftBox.y1 - draftBox.y0)
    setDraftBox(null)
    if (w < MIN_BOX_SIZE || h < MIN_BOX_SIZE) return
    onCreateAnnotation({ type: tool === 'cuboid' ? 'cuboid' : 'box', box: { x, y, w, h } })
  }

  const handleDoubleClick = () => {
    if (draftPolygon && draftPolygon.points.length >= 3) {
      onCreateAnnotation({ type: 'polygon', points: draftPolygon.points })
      setDraftPolygon(null)
    }
  }

  const visibleAnnotations = annotations.filter((a) => labelVisibility.has(a.labelId))
  const isDrawing = Boolean(draftBox || draftLine || draftPolygon)

  const cursorClass = panMode ? (panDrag ? 'cursor-grabbing' : 'cursor-grab') : drawingDisabled ? '' : 'cursor-crosshair'

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-zinc-950">
      <div
        ref={containerRef}
        className="relative h-full w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      >
        {rect.width > 0 && (
          <>
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              muted
              playsInline
              disablePictureInPicture
              preload="metadata"
              onTimeUpdate={onVideoTimeUpdate}
              onPlay={onVideoPlay}
              onPause={onVideoPause}
              onEnded={onVideoEnded}
              className={cn('absolute select-none rounded-sm shadow-2xl shadow-black/60', cursorClass)}
              style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, maxWidth: 'none' }}
            />

            {tool === 'box' && !autoLabelMode && !panMode && hoverPos && !draftBox && (
              <div
                className="pointer-events-none absolute"
                style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
              >
                <div className="absolute top-0 h-full border-l border-dashed border-yellow-400/50" style={{ left: `${hoverPos.x}%` }} />
                <div className="absolute left-0 w-full border-t border-dashed border-yellow-400/50" style={{ top: `${hoverPos.y}%` }} />
              </div>
            )}

            <svg
              ref={svgRef}
              className="absolute"
              style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
              width={rect.width}
              height={rect.height}
            >
              <g style={{ opacity: isDrawing ? 0.2 : 1, transition: 'opacity 150ms ease' }}>
                {visibleAnnotations.map((a) => (
                  <AnnotationShape key={a.id} annotation={a} selected={a.id === selectedId} px={px} py={py} onSelect={onSelect} />
                ))}
              </g>

              {autoLabelMode &&
                suggestions.map((s, i) => (
                  <SuggestionShape
                    key={s.id}
                    suggestion={s}
                    index={i}
                    px={px}
                    py={py}
                    hovered={hoveredSuggestion === s.id}
                    onHover={setHoveredSuggestion}
                    onDismiss={onDismissSuggestion}
                  />
                ))}

              {draftBox && (
                <rect
                  x={px(Math.min(draftBox.x0, draftBox.x1))}
                  y={py(Math.min(draftBox.y0, draftBox.y1))}
                  width={px(Math.abs(draftBox.x1 - draftBox.x0))}
                  height={py(Math.abs(draftBox.y1 - draftBox.y0))}
                  fill="rgba(59,130,246,0.15)"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              )}

              {draftLine && (
                <line
                  x1={px(draftLine.x0)}
                  y1={py(draftLine.y0)}
                  x2={px(draftLine.x1)}
                  y2={py(draftLine.y1)}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              )}

              {draftPolygon && (
                <g>
                  <polyline
                    points={[...draftPolygon.points, draftPolygon.cursor].map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  {draftPolygon.points.map((p, i) => (
                    <circle
                      key={i}
                      cx={px(p.x)}
                      cy={py(p.y)}
                      r={4}
                      fill={i === 0 ? '#0b1220' : '#3b82f6'}
                      stroke="#3b82f6"
                      strokeWidth={i === 0 ? 2 : 1}
                    />
                  ))}
                </g>
              )}
            </svg>

            {autoLabelMode && (
              <AutoLabelBar
                confidence={confidence}
                onConfidenceChange={onConfidenceChange}
                onAccept={onAcceptAutoLabel}
                onReject={onRejectAutoLabel}
              />
            )}
          </>
        )}
      </div>

      {!autoLabelMode && !panMode && !activeLabel && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
          Pick a label above, then click and drag on the image to annotate
        </div>
      )}
    </div>
  )
}

function AnnotationShape({ annotation, selected, px, py, onSelect }) {
  const stroke = annotation.color
  const fill = selected ? `${annotation.color}33` : `${annotation.color}1a`
  const strokeWidth = selected ? 2.5 : 1.5

  const commonProps = {
    'data-annotation-shape': true,
    onMouseDown: (e) => {
      e.stopPropagation()
      onSelect(annotation.id)
    },
    className: 'cursor-pointer',
  }

  if (annotation.type === 'box') {
    const { x, y, w, h } = annotation.box
    return (
      <g>
        <rect {...commonProps} x={px(x)} y={py(y)} width={px(w)} height={py(h)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        {selected && <HandleDots x={px(x)} y={py(y)} w={px(w)} h={py(h)} color={stroke} />}
      </g>
    )
  }

  if (annotation.type === 'cuboid') {
    const { x, y, w, h } = annotation.box
    const offset = Math.min(px(w), py(h)) * 0.28
    const x0 = px(x)
    const y0 = py(y)
    const w0 = px(w)
    const h0 = py(h)
    return (
      <g {...commonProps}>
        <polygon
          points={`${x0 + offset},${y0} ${x0 + w0 + offset},${y0} ${x0 + w0},${y0 + offset * 0.6} ${x0},${y0 + offset * 0.6}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <line x1={x0 + offset} y1={y0} x2={x0} y2={y0 + offset * 0.6} stroke={stroke} strokeWidth={strokeWidth} />
        <line x1={x0 + w0 + offset} y1={y0} x2={x0 + w0} y2={y0 + offset * 0.6} stroke={stroke} strokeWidth={strokeWidth} />
        <rect x={x0} y={y0 + offset * 0.6} width={w0} height={h0} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      </g>
    )
  }

  if (annotation.type === 'polygon') {
    return (
      <g>
        <polygon
          {...commonProps}
          points={annotation.points.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
          fill="transparent"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {selected &&
          annotation.points.map((p, i) => (
            <circle key={i} cx={px(p.x)} cy={py(p.y)} r={4} fill="#0b0f19" stroke={stroke} strokeWidth={2} />
          ))}
      </g>
    )
  }

  if (annotation.type === 'line') {
    const [p0, p1] = annotation.points
    return (
      <g {...commonProps}>
        <line x1={px(p0.x)} y1={py(p0.y)} x2={px(p1.x)} y2={py(p1.y)} stroke={stroke} strokeWidth={strokeWidth + 1} />
        <circle cx={px(p0.x)} cy={py(p0.y)} r={4} fill={stroke} />
        <circle cx={px(p1.x)} cy={py(p1.y)} r={4} fill={stroke} />
      </g>
    )
  }

  if (annotation.type === 'landmark') {
    return (
      <g {...commonProps}>
        <circle cx={px(annotation.point.x)} cy={py(annotation.point.y)} r={selected ? 7 : 6} fill={stroke} stroke="#0b0f19" strokeWidth={2} />
      </g>
    )
  }

  return null
}

function HandleDots({ x, y, w, h, color }) {
  const points = [
    [x, y],
    [x + w / 2, y],
    [x + w, y],
    [x, y + h / 2],
    [x + w, y + h / 2],
    [x, y + h],
    [x + w / 2, y + h],
    [x + w, y + h],
  ]
  return (
    <>
      {points.map(([cx, cy], i) => (
        <rect key={i} x={cx - 3} y={cy - 3} width={6} height={6} fill="#0b0f19" stroke={color} strokeWidth={1.5} />
      ))}
    </>
  )
}

const SUGGESTION_PALETTE = ['#991b1b', '#c2410c', '#7c3aed', '#a16207', '#15803d', '#1d4ed8', '#be123c']

function SuggestionShape({ suggestion, index, px, py, hovered, onHover, onDismiss }) {
  const { x, y, w, h } = suggestion.box
  const color = SUGGESTION_PALETTE[index % SUGGESTION_PALETTE.length]
  const bx = px(x)
  const by = py(y)
  const bw = px(w)
  const bh = py(h)
  return (
    <g
      onMouseEnter={() => onHover(suggestion.id)}
      onMouseLeave={() => onHover(null)}
      className="cursor-pointer"
    >
      <rect x={bx} y={by} width={bw} height={bh} fill={hovered ? `${color}22` : 'transparent'} stroke={color} strokeWidth={hovered ? 2.5 : 1.5} />
      {hovered && (
        <foreignObject x={bx + bw - 24} y={by - 12} width={24} height={24}>
          <button
            onMouseDown={(e) => {
              e.stopPropagation()
              onDismiss(suggestion.id)
            }}
            className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-zinc-900 text-zinc-400 shadow-sm hover:bg-zinc-800 hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </foreignObject>
      )}
    </g>
  )
}
