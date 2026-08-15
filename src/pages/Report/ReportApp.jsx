import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_INTERVAL_MS = 45_000
const IDLE_THRESHOLD_MS = 30_000

function fmtDuration(ms) {
  if (!Number.isFinite(ms)) return '—'
  const totalSeconds = ms / 1000
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds - m * 60
  return m > 0 ? `${m}m ${s.toFixed(1)}s` : `${s.toFixed(1)}s`
}

function fmtNum(n, digits = 0) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '' : '−'}${Math.abs(n).toFixed(0)}%`
}

function fmtClock(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function useIdleAfter(ms) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), ms)
    const reset = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), ms)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [ms])
  return idle
}

function useReportData() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const res = await fetch('/api/report-data', { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`)
      setData(body)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load live data.')
    } finally {
      setLoading(false)
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  return { data, error, loading, refresh }
}

export default function ReportApp() {
  const { data, error, loading, refresh } = useReportData()
  const idle = useIdleAfter(IDLE_THRESHOLD_MS)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-5 py-14">
        <Header data={data} loading={loading} idle={idle} onRefresh={refresh} />

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && !data && <LoadingState />}

        {data && data.qualifyingSessionCount === 0 && <EmptyState />}

        {data && data.qualifyingSessionCount > 0 && (
          <div className="mt-8 flex flex-col gap-14">
            <HeadlineStats aggregate={data.aggregate} sessionCount={data.qualifyingSessionCount} />
            <TaskCompletion sessions={data.sessions} displayed={data.displayedSessionCount} total={data.qualifyingSessionCount} />
            <InteractionLoad rows={data.interactionLoad} />
            <ZoomStats zoom={data.zoom} />
            <LabelSequencing sessions={data.labelSequencing} batching={data.batching} />
          </div>
        )}
      </div>
    </div>
  )
}

function Header({ data, loading, idle, onRefresh }) {
  return (
    <header className="border-b border-border pb-7">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full bg-[var(--success)] ${loading ? '' : 'live-dot'}`} />
        <span>Live · PostHog</span>
        <span>·</span>
        <span>{fmtClock(data?.generatedAt)}</span>
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">Data Annotator: v1 vs v2</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Every visitor who completes both prototypes adds to these numbers. Sessions under 24 hours old count
        immediately; after that they need 30+ annotations on both sides to stay counted, so quick test runs don't
        skew the average.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-muted-foreground">
          Last updated <b className="font-medium text-foreground">{fmtClock(data?.generatedAt)}</b>
        </span>
        {idle && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground shadow-sm transition hover:bg-accent"
          >
            Refresh now
          </button>
        )}
      </div>
    </header>
  )
}

function LoadingState() {
  return (
    <div className="mt-10 flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
      No sessions have completed both v1 and v2 yet. Try the flow yourself from the prototype — this page updates
      automatically once a session qualifies.
    </div>
  )
}

function Card({ children, className = '' }) {
  return <div className={`rounded-lg border border-border bg-card p-4 shadow-sm ${className}`}>{children}</div>
}

function SectionHead({ title, tag }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {tag && (
        <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {tag}
        </span>
      )}
    </div>
  )
}

function HeadlineStats({ aggregate, sessionCount }) {
  const stats = [
    { label: 'Sessions completing both v1 and v2', value: fmtNum(sessionCount) },
    { label: 'Faster per annotation in v2', value: fmtPct(aggregate.fasterPerAnnotationPct) },
    { label: 'Fewer clicks in v2', value: fmtPct(aggregate.fewerClicksPct) },
    { label: 'Avg time per annotation (v1 / v2)', value: `${fmtDuration(aggregate.v1.msPerAnnotation)} / ${fmtDuration(aggregate.v2.msPerAnnotation)}` },
  ]
  return (
    <section>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card p-4">
            <div className="font-mono text-xl font-semibold tabular-nums">{s.value}</div>
            <div className="mt-1.5 text-xs leading-snug text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function VChip({ version }) {
  const isV1 = version === 'v1'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-medium"
      style={{
        background: isV1 ? 'var(--v1-soft)' : 'var(--v2-soft)',
        color: isV1 ? 'var(--v1-text)' : 'var(--v2-text)',
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: isV1 ? 'var(--v1)' : 'var(--v2)' }} />
      {version.toUpperCase()}
    </span>
  )
}

function Bar({ pct, version }) {
  return (
    <div className="h-4 flex-1 overflow-hidden rounded-sm bg-muted">
      <div
        className="h-full rounded-sm"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: version === 'v1' ? 'var(--v1)' : 'var(--v2)' }}
      />
    </div>
  )
}

function TaskCompletion({ sessions, displayed, total }) {
  return (
    <section>
      <SectionHead title="Task completion, per session" tag={`showing latest ${displayed} of ${total}`} />
      <div className="flex flex-col gap-2">
        {sessions.map((s, i) => {
          const maxDur = Math.max(s.v1.durationMs, s.v2.durationMs)
          return (
            <Card key={s.sessionId}>
              <div className="mb-3 font-mono text-[11px] text-muted-foreground">Session {sessions.length - i}</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <VChip version="v1" />
                  <Bar pct={(s.v1.durationMs / maxDur) * 100} version="v1" />
                  <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {fmtDuration(s.v1.durationMs)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <VChip version="v2" />
                  <Bar pct={(s.v2.durationMs / maxDur) * 100} version="v2" />
                  <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {fmtDuration(s.v2.durationMs)}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-dashed border-border pt-3 text-xs">
                <div className="text-muted-foreground">
                  Annotations <b className="font-mono text-foreground">{s.v1.annotations} / {s.v2.annotations}</b>
                </div>
                <div className="text-muted-foreground">
                  Clicks <b className="font-mono text-foreground">{s.v1.clicks} / {s.v2.clicks}</b>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

function InteractionLoad({ rows }) {
  const maxCount = Math.max(1, ...rows.map((r) => Math.max(r.v1, r.v2)))
  return (
    <section>
      <SectionHead title="Interaction load, top clicked elements" />
      <Card>
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.element} className="flex items-center gap-3">
              <div className="w-28 shrink-0 truncate text-xs text-muted-foreground" title={r.element}>
                {r.element}
              </div>
              <div className="flex flex-1 items-center gap-1.5">
                <Bar pct={(r.v1 / maxCount) * 100} version="v1" />
                <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{r.v1}</span>
              </div>
              <div className="flex flex-1 items-center gap-1.5">
                <Bar pct={(r.v2 / maxCount) * 100} version="v2" />
                <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{r.v2}</span>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="text-sm text-muted-foreground">No click data yet.</div>}
        </div>
        <div className="mt-3 flex gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><VChip version="v1" /> button clicks</span>
          <span className="flex items-center gap-1.5"><VChip version="v2" /> button clicks</span>
        </div>
      </Card>
    </section>
  )
}

function ZoomStats({ zoom }) {
  if (!zoom) return null
  const v1ZoomTotal = zoom.v1.button.in + zoom.v1.button.out
  const v2ZoomTotal = zoom.v2.trackpad.in + zoom.v2.trackpad.out + zoom.v2.button.in + zoom.v2.button.out
  return (
    <section>
      <SectionHead title="Zoom & rage-clicks" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <VChip version="v1" />
            <span className="font-mono text-xs text-muted-foreground">button zoom only</span>
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums">{v1ZoomTotal}</div>
          <div className="mt-1 text-xs text-muted-foreground">zoom-button clicks</div>
          <div className="mt-3 border-t border-border pt-3 text-xs">
            <span className="text-muted-foreground">Rage-clicks </span>
            <b className="font-mono" style={{ color: zoom.v1.rageclicks > 0 ? 'var(--destructive)' : undefined }}>
              {zoom.v1.rageclicks}
            </b>
          </div>
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <VChip version="v2" />
            <span className="font-mono text-xs text-muted-foreground">trackpad + button</span>
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums">{v2ZoomTotal}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {zoom.v2.trackpad.in + zoom.v2.trackpad.out} trackpad, {zoom.v2.button.in + zoom.v2.button.out} button
          </div>
          <div className="mt-3 border-t border-border pt-3 text-xs">
            <span className="text-muted-foreground">Rage-clicks </span>
            <b className="font-mono" style={{ color: zoom.v2.rageclicks > 0 ? 'var(--destructive)' : undefined }}>
              {zoom.v2.rageclicks}
            </b>
          </div>
        </Card>
      </div>
    </section>
  )
}

function DotGrid({ blocks }) {
  return (
    <div className="flex flex-wrap gap-[3px]">
      {blocks.map((b, i) =>
        Array.from({ length: b.count }, (_, j) => (
          <span key={`${i}-${j}`} className={`dot ${b.label.toLowerCase()}`} />
        )),
      )}
    </div>
  )
}

function LabelSequencing({ sessions, batching }) {
  const v1Rate = batching.v1.transitions > 0 ? (batching.v1.switches / batching.v1.transitions) * 100 : 0
  const v2Rate = batching.v2.transitions > 0 ? (batching.v2.switches / batching.v2.transitions) * 100 : 0
  return (
    <section>
      <SectionHead title="Label sequencing: batched or scattered?" />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Each dot is one annotation, in the order it was drawn. Any label other than Car/Bike/Bus counts as a stray
        click.
      </p>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <LegendItem colorVar="--label-car" label="Car" />
        <LegendItem colorVar="--label-bike" label="Bike" />
        <LegendItem colorVar="--label-bus" label="Bus" />
        <LegendItem colorVar="--label-stray" label="Stray click" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
        <div className="bg-card p-4">
          <VChip version="v1" />
          <div className="mt-2 font-mono text-lg font-semibold tabular-nums">{v1Rate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">switch rate ({batching.v1.switches} of {batching.v1.transitions})</div>
        </div>
        <div className="bg-card p-4">
          <VChip version="v2" />
          <div className="mt-2 font-mono text-lg font-semibold tabular-nums">{v2Rate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">switch rate ({batching.v2.switches} of {batching.v2.transitions})</div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {sessions.map((s, i) => (
          <Card key={s.sessionId}>
            <div className="mb-2 font-mono text-[11px] text-muted-foreground">Session {sessions.length - i}</div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-2">
                <VChip version="v1" />
                <DotGrid blocks={s.v1.blocks} />
              </div>
              <div className="flex items-start gap-2">
                <VChip version="v2" />
                <DotGrid blocks={s.v2.blocks} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function LegendItem({ colorVar, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(${colorVar})` }} />
      {label}
    </span>
  )
}
