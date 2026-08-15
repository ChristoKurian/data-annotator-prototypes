// Live comparison stats for the v1/v2 case study. Reads with a read-only
// PostHog personal API key (POSTHOG_API_KEY) — never writes anything back.
//
// "Completed both" = a session has fired task_submitted for both prototype
// versions. To keep the page feeling live without letting quick test runs
// permanently skew the aggregates, a session younger than 24h counts
// regardless of size; once it's 24h+ old it only counts if it has 30+
// annotations on both sides. This is computed fresh on every request —
// there's no separate cleanup job or stored exclusion list to go stale.

const HOST = process.env.POSTHOG_HOST || 'https://us.posthog.com'
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '557254'
const MAX_DISPLAYED_SESSIONS = 20
const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000
const MIN_ANNOTATIONS = 30

const UUID_RE = /^[0-9a-fA-F-]{8,40}$/

async function hogql(apiKey, query) {
  const res = await fetch(`${HOST}/api/projects/${PROJECT_ID}/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = body?.detail || body?.error || res.statusText
    throw new Error(`PostHog query failed (${res.status}): ${detail}`)
  }
  const columns = body.columns || []
  return (body.results || []).map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}

function idList(ids) {
  const safe = ids.filter((id) => UUID_RE.test(id))
  return safe.map((id) => `'${id}'`).join(',')
}

function normalizeLabel(label) {
  return label === 'Car' || label === 'Bike' || label === 'Bus' ? label : 'Stray'
}

function runLengthEncode(labels) {
  const blocks = []
  for (const label of labels) {
    const norm = normalizeLabel(label)
    const last = blocks[blocks.length - 1]
    if (last && last.label === norm) last.count += 1
    else blocks.push({ label: norm, count: 1 })
  }
  return blocks
}

export default async function handler(req, res) {
  const apiKey = process.env.POSTHOG_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'POSTHOG_API_KEY is not configured on the server.' })
    return
  }

  try {
    const sessionRows = await hogql(
      apiKey,
      `SELECT
         session_id,
         argMaxIf(ann, ts, version = 'v1') AS v1_ann,
         argMaxIf(dur, ts, version = 'v1') AS v1_dur,
         maxIf(ts, version = 'v1') AS v1_submitted,
         argMaxIf(ann, ts, version = 'v2') AS v2_ann,
         argMaxIf(dur, ts, version = 'v2') AS v2_dur,
         maxIf(ts, version = 'v2') AS v2_submitted
       FROM (
         SELECT
           $session_id AS session_id,
           properties.prototype_version AS version,
           toInt(properties.annotation_count) AS ann,
           toInt(properties.duration_ms) AS dur,
           timestamp AS ts
         FROM events
         WHERE event = 'task_submitted' AND timestamp >= now() - INTERVAL 90 DAY
       )
       GROUP BY session_id
       HAVING v1_ann IS NOT NULL AND v2_ann IS NOT NULL
       ORDER BY v2_submitted DESC
       LIMIT 2000`,
    )

    const now = Date.now()
    const qualifying = sessionRows.filter((r) => {
      const completedAt = new Date(r.v2_submitted).getTime()
      const isFresh = now - completedAt < FRESH_WINDOW_MS
      const meetsFloor = r.v1_ann >= MIN_ANNOTATIONS && r.v2_ann >= MIN_ANNOTATIONS
      return isFresh || meetsFloor
    })

    if (qualifying.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
      res.status(200).json({
        generatedAt: new Date().toISOString(),
        qualifyingSessionCount: 0,
        aggregate: null,
        sessions: [],
        interactionLoad: [],
        zoom: null,
        labelSequencing: [],
      })
      return
    }

    const ids = idList(qualifying.map((r) => r.session_id))
    // Label sequencing only ever renders the displayed (latest) slice, and
    // annotation_created is high-volume (one row per shape drawn) — scoping
    // this query to just those sessions keeps it well under any row cap
    // regardless of how many sessions have qualified all-time.
    const displayedIds = idList(qualifying.slice(0, MAX_DISPLAYED_SESSIONS).map((r) => r.session_id))

    const [clickTotalRows, clicksByElementRows, zoomRows, labelRows] = await Promise.all([
      hogql(
        apiKey,
        `SELECT $session_id AS session_id, properties.prototype_version AS version, count() AS clicks
         FROM events
         WHERE event = '$autocapture' AND $session_id IN (${ids})
         GROUP BY session_id, version
         LIMIT 5000`,
      ),
      hogql(
        apiKey,
        `SELECT properties.prototype_version AS version, properties.$el_text AS el_text, count() AS cnt
         FROM events
         WHERE event = '$autocapture' AND $session_id IN (${ids})
           AND properties.$el_text IS NOT NULL AND properties.$el_text != ''
         GROUP BY version, el_text
         ORDER BY cnt DESC
         LIMIT 500`,
      ),
      hogql(
        apiKey,
        `SELECT properties.prototype_version AS version, event, properties.method AS method, properties.direction AS direction, count() AS cnt
         FROM events
         WHERE event IN ('canvas_zoom', '$rageclick') AND $session_id IN (${ids})
         GROUP BY version, event, method, direction
         LIMIT 500`,
      ),
      hogql(
        apiKey,
        `SELECT $session_id AS session_id, properties.prototype_version AS version, properties.label AS label, timestamp
         FROM events
         WHERE event = 'annotation_created' AND $session_id IN (${displayedIds})
         ORDER BY session_id, version, timestamp
         LIMIT 50000`,
      ),
    ])

    const clicksBySession = new Map()
    for (const row of clickTotalRows) {
      clicksBySession.set(`${row.session_id}:${row.version}`, row.clicks)
    }

    const sessions = qualifying.map((r) => ({
      sessionId: r.session_id,
      completedAt: r.v2_submitted,
      v1: { annotations: r.v1_ann, durationMs: r.v1_dur, clicks: clicksBySession.get(`${r.session_id}:v1`) || 0 },
      v2: { annotations: r.v2_ann, durationMs: r.v2_dur, clicks: clicksBySession.get(`${r.session_id}:v2`) || 0 },
    }))

    const sumBy = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0)
    const v1Totals = {
      annotations: sumBy(sessions, (s) => s.v1.annotations),
      clicks: sumBy(sessions, (s) => s.v1.clicks),
      durationMs: sumBy(sessions, (s) => s.v1.durationMs),
    }
    const v2Totals = {
      annotations: sumBy(sessions, (s) => s.v2.annotations),
      clicks: sumBy(sessions, (s) => s.v2.clicks),
      durationMs: sumBy(sessions, (s) => s.v2.durationMs),
    }
    const n = sessions.length
    const aggregate = {
      sessionCount: n,
      v1: {
        ...v1Totals,
        avgDurationMs: v1Totals.durationMs / n,
        avgClicks: v1Totals.clicks / n,
        avgAnnotations: v1Totals.annotations / n,
        msPerAnnotation: v1Totals.durationMs / v1Totals.annotations,
      },
      v2: {
        ...v2Totals,
        avgDurationMs: v2Totals.durationMs / n,
        avgClicks: v2Totals.clicks / n,
        avgAnnotations: v2Totals.annotations / n,
        msPerAnnotation: v2Totals.durationMs / v2Totals.annotations,
      },
      fasterPerAnnotationPct:
        ((v1Totals.durationMs / v1Totals.annotations - v2Totals.durationMs / v2Totals.annotations) /
          (v1Totals.durationMs / v1Totals.annotations)) *
        100,
      fewerClicksPct: ((v1Totals.clicks - v2Totals.clicks) / v1Totals.clicks) * 100,
    }

    const elementTotals = new Map()
    for (const row of clicksByElementRows) {
      const key = row.el_text
      const entry = elementTotals.get(key) || { element: key, v1: 0, v2: 0 }
      entry[row.version] = (entry[row.version] || 0) + row.cnt
      elementTotals.set(key, entry)
    }
    const interactionLoad = [...elementTotals.values()]
      .sort((a, b) => b.v1 + b.v2 - (a.v1 + a.v2))
      .slice(0, 10)

    const zoom = { v1: { button: { in: 0, out: 0, reset: 0 }, rageclicks: 0 }, v2: { trackpad: { in: 0, out: 0 }, button: { in: 0, out: 0, reset: 0 }, rageclicks: 0 } }
    for (const row of zoomRows) {
      const v = zoom[row.version]
      if (!v) continue
      if (row.event === '$rageclick') v.rageclicks += row.cnt
      else if (row.event === 'canvas_zoom' && row.method && v[row.method]) v[row.method][row.direction] = (v[row.method][row.direction] || 0) + row.cnt
    }

    const labelsBySessionVersion = new Map()
    for (const row of labelRows) {
      const key = `${row.session_id}:${row.version}`
      if (!labelsBySessionVersion.has(key)) labelsBySessionVersion.set(key, [])
      labelsBySessionVersion.get(key).push(row.label)
    }

    let v1SwitchTotal = 0, v1TransitionTotal = 0, v2SwitchTotal = 0, v2TransitionTotal = 0
    const labelSequencing = sessions.slice(0, MAX_DISPLAYED_SESSIONS).map((s) => {
      const v1Labels = labelsBySessionVersion.get(`${s.sessionId}:v1`) || []
      const v2Labels = labelsBySessionVersion.get(`${s.sessionId}:v2`) || []
      const v1Blocks = runLengthEncode(v1Labels)
      const v2Blocks = runLengthEncode(v2Labels)
      v1SwitchTotal += Math.max(0, v1Blocks.length - 1)
      v1TransitionTotal += Math.max(0, v1Labels.length - 1)
      v2SwitchTotal += Math.max(0, v2Blocks.length - 1)
      v2TransitionTotal += Math.max(0, v2Labels.length - 1)
      return {
        sessionId: s.sessionId,
        v1: { blocks: v1Blocks, total: v1Labels.length, switches: Math.max(0, v1Blocks.length - 1) },
        v2: { blocks: v2Blocks, total: v2Labels.length, switches: Math.max(0, v2Blocks.length - 1) },
      }
    })

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      qualifyingSessionCount: qualifying.length,
      displayedSessionCount: sessions.length,
      aggregate,
      sessions: sessions.slice(0, MAX_DISPLAYED_SESSIONS),
      interactionLoad,
      zoom,
      labelSequencing,
      batching: {
        v1: { switches: v1SwitchTotal, transitions: v1TransitionTotal },
        v2: { switches: v2SwitchTotal, transitions: v2TransitionTotal },
      },
    })
  } catch (err) {
    res.status(502).json({ error: 'Failed to load live data from PostHog.', detail: String(err?.message || err) })
  }
}
