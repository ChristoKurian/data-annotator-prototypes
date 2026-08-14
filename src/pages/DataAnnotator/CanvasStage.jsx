import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useContainRect } from './useContainRect'
import { VIDEO_SIZE, VIDEO_SRC } from './mockData'
import LabelPicker from './LabelPicker'

const MIN_BOX_SIZE = 1.2 // percent
const CLOSE_RADIUS = 2.2 // percent, distance to first point that closes a polygon

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export default function CanvasStage({
  annotations,
  suggestions,
  activeTool,
  onCreateAnnotation,
  selectedId,
  onSelect,
  showAnnotations,
  showLabels,
  autoLabelMode,
  zoom,
  filterCss,
  videoRef,
  onVideoTimeUpdate,
  onVideoPlay,
  onVideoPause,
  onVideoEnded,
}) {
  const { containerRef, rect: baseRect } = useContainRect(VIDEO_SIZE)
  const svgRef = useRef(null)

  const [draftBox, setDraftBox] = useState(null) // {x0,y0,x1,y1} percent
  const [draftPolygon, setDraftPolygon] = useState(null) // {points:[{x,y}], cursor:{x,y}}
  const [draftLine, setDraftLine] = useState(null) // {x0,y0,x1,y1}
  const [hoverPos, setHoverPos] = useState(null)
  const [pendingShape, setPendingShape] = useState(null) // {data, anchor:{x,y} percent}

  // The image + overlay are rendered at this rect (base contain-rect scaled
  // and re-centered by `zoom`), so drawing math and rendering always agree.
  const rect = {
    x: baseRect.x - (baseRect.width * (zoom - 1)) / 2,
    y: baseRect.y - (baseRect.height * (zoom - 1)) / 2,
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

  const drawingDisabled = autoLabelMode || !activeTool || !!pendingShape

  const beginLabeling = (data, anchor) => setPendingShape({ data, anchor })

  const handleMouseDown = (e) => {
    if (drawingDisabled) return
    if (e.target.closest('[data-annotation-shape]')) return // clicking a shape, not the canvas
    const p = toPercent(e.clientX, e.clientY)

    if (activeTool === 'box' || activeTool === 'cuboid') {
      setDraftBox({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
    } else if (activeTool === 'landmark') {
      beginLabeling({ type: 'landmark', point: p }, p)
    } else if (activeTool === 'line') {
      if (!draftLine) {
        setDraftLine({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
      } else {
        beginLabeling(
          { type: 'line', points: [{ x: draftLine.x0, y: draftLine.y0 }, p] },
          { x: draftLine.x0, y: draftLine.y0 },
        )
        setDraftLine(null)
      }
    } else if (activeTool === 'polygon') {
      if (!draftPolygon) {
        setDraftPolygon({ points: [p], cursor: p })
      } else {
        const first = draftPolygon.points[0]
        const dist = Math.hypot(p.x - first.x, p.y - first.y)
        if (draftPolygon.points.length >= 3 && dist < CLOSE_RADIUS) {
          beginLabeling({ type: 'polygon', points: draftPolygon.points }, first)
          setDraftPolygon(null)
        } else {
          setDraftPolygon({ points: [...draftPolygon.points, p], cursor: p })
        }
      }
    }
  }

  const handleMouseMove = (e) => {
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
    if (!draftBox) return
    const x = Math.min(draftBox.x0, draftBox.x1)
    const y = Math.min(draftBox.y0, draftBox.y1)
    const w = Math.abs(draftBox.x1 - draftBox.x0)
    const h = Math.abs(draftBox.y1 - draftBox.y0)
    setDraftBox(null)
    if (w < MIN_BOX_SIZE || h < MIN_BOX_SIZE) return
    beginLabeling({ type: activeTool === 'cuboid' ? 'cuboid' : 'box', box: { x, y, w, h } }, { x, y })
  }

  const handleDoubleClick = () => {
    if (draftPolygon && draftPolygon.points.length >= 3) {
      beginLabeling({ type: 'polygon', points: draftPolygon.points }, draftPolygon.points[0])
      setDraftPolygon(null)
    }
  }

  const handleLabelSelect = (label) => {
    if (!pendingShape) return
    onCreateAnnotation({ ...pendingShape.data, label })
    setPendingShape(null)
  }

  const handleLabelCancel = () => setPendingShape(null)

  const pendingScreenPos =
    pendingShape && containerRef.current
      ? (() => {
          const bounds = containerRef.current.getBoundingClientRect()
          return {
            x: bounds.left + rect.x + px(pendingShape.anchor.x) + 10,
            y: bounds.top + rect.y + py(pendingShape.anchor.y) + 10,
          }
        })()
      : null

  const cursorClass = drawingDisabled
    ? ''
    : activeTool === 'landmark'
      ? 'cursor-crosshair'
      : 'cursor-crosshair'

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
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                maxWidth: 'none',
                filter: filterCss,
              }}
            />

            {/* crosshair guides while box tool is armed */}
            {activeTool === 'box' && !autoLabelMode && hoverPos && !draftBox && (
              <div
                className="pointer-events-none absolute"
                style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
              >
                <div
                  className="absolute top-0 h-full border-l border-dashed border-yellow-400/50"
                  style={{ left: `${hoverPos.x}%` }}
                />
                <div
                  className="absolute left-0 w-full border-t border-dashed border-yellow-400/50"
                  style={{ top: `${hoverPos.y}%` }}
                />
              </div>
            )}

            <svg
              ref={svgRef}
              className="absolute"
              style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
              width={rect.width}
              height={rect.height}
            >
              {showAnnotations &&
                annotations.map((a) => (
                  <AnnotationShape
                    key={a.id}
                    annotation={a}
                    selected={a.id === selectedId}
                    showLabels={showLabels}
                    px={px}
                    py={py}
                    onSelect={onSelect}
                  />
                ))}

              {autoLabelMode &&
                suggestions.map((s) => (
                  <SuggestionShape key={s.id} suggestion={s} px={px} py={py} />
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
                    points={[...draftPolygon.points, draftPolygon.cursor]
                      .map((p) => `${px(p.x)},${py(p.y)}`)
                      .join(' ')}
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

              {pendingShape && (
                <AnnotationShape
                  annotation={{ id: 'pending', color: '#3b82f6', label: '', ...pendingShape.data }}
                  selected
                  showLabels={false}
                  px={px}
                  py={py}
                  onSelect={() => {}}
                />
              )}
            </svg>
          </>
        )}
      </div>

      {!activeTool && !autoLabelMode && annotations.length === 0 && !pendingShape && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
          Pick a tool above, then click and drag on the image to annotate
        </div>
      )}

      {pendingShape && pendingScreenPos && (
        <LabelPicker x={pendingScreenPos.x} y={pendingScreenPos.y} onSelect={handleLabelSelect} onCancel={handleLabelCancel} />
      )}
    </div>
  )
}

function AnnotationShape({ annotation, selected, showLabels, px, py, onSelect }) {
  const stroke = annotation.color
  const fill = selected ? `${annotation.color}55` : `${annotation.color}33`
  const strokeWidth = selected ? 2.5 : 1.5

  const labelBadge = showLabels && (
    <text
      x={annotation.type === 'landmark' ? px(annotation.point.x) + 10 : px(bboxOf(annotation).x)}
      y={annotation.type === 'landmark' ? py(annotation.point.y) - 10 : py(bboxOf(annotation).y) - 6}
      fill={stroke}
      fontSize={12}
      fontWeight={600}
      style={{ paintOrder: 'stroke', stroke: '#0b0f19', strokeWidth: 3 }}
    >
      {annotation.label}
    </text>
  )

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
        <rect
          {...commonProps}
          x={px(x)}
          y={py(y)}
          width={px(w)}
          height={py(h)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {selected && <HandleDots x={px(x)} y={py(y)} w={px(w)} h={py(h)} color={stroke} />}
        {labelBadge}
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
        <line
          x1={x0 + w0 + offset}
          y1={y0}
          x2={x0 + w0}
          y2={y0 + offset * 0.6}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <rect x={x0} y={y0 + offset * 0.6} width={w0} height={h0} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        {labelBadge}
      </g>
    )
  }

  if (annotation.type === 'polygon') {
    return (
      <g>
        <polygon
          {...commonProps}
          points={annotation.points.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {selected &&
          annotation.points.map((p, i) => (
            <circle key={i} cx={px(p.x)} cy={py(p.y)} r={4} fill="#0b0f19" stroke={stroke} strokeWidth={2} />
          ))}
        {labelBadge}
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
        {labelBadge}
      </g>
    )
  }

  if (annotation.type === 'landmark') {
    return (
      <g {...commonProps}>
        <circle cx={px(annotation.point.x)} cy={py(annotation.point.y)} r={selected ? 7 : 6} fill={stroke} stroke="#0b0f19" strokeWidth={2} />
        {labelBadge}
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

function SuggestionShape({ suggestion, px, py }) {
  const { x, y, w, h } = suggestion.box
  const color = suggestion.label === 'person' ? '#ec4899' : '#eab308'
  return (
    <g>
      <rect
        x={px(x)}
        y={py(y)}
        width={px(w)}
        height={py(h)}
        fill={`${color}22`}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
    </g>
  )
}

function bboxOf(annotation) {
  if (annotation.type === 'box' || annotation.type === 'cuboid') return annotation.box
  if (annotation.type === 'polygon') {
    const xs = annotation.points.map((p) => p.x)
    const ys = annotation.points.map((p) => p.y)
    return { x: Math.min(...xs), y: Math.min(...ys) }
  }
  if (annotation.type === 'line') {
    const xs = annotation.points.map((p) => p.x)
    const ys = annotation.points.map((p) => p.y)
    return { x: Math.min(...xs), y: Math.min(...ys) }
  }
  return { x: 0, y: 0 }
}
