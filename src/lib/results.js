const STORAGE_PREFIX = 'data-annotator:result:'

// Persists a completed run's summary so the other prototype (a separate
// page load, V1's index.html vs V2's v2.html) can read it back for
// side-by-side comparison on its own completion screen.
export function saveResult(version, summary) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${version}`, JSON.stringify(summary))
  } catch {
    // Storage unavailable (private browsing, etc.) — summary just won't
    // carry over to the other prototype's completion screen.
  }
}

export function loadResult(version) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${version}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function summarizeAnnotations(annotations, durationMs) {
  const perLabel = {}
  for (const a of annotations) {
    perLabel[a.label] = (perLabel[a.label] ?? 0) + 1
  }
  const count = annotations.length
  return {
    perLabel,
    count,
    durationMs,
    avgMs: count > 0 ? durationMs / count : 0,
  }
}
