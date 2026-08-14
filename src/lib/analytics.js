import posthog from 'posthog-js'

const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let ready = false

// No-ops safely until VITE_POSTHOG_KEY is set (see .env.example), so the
// prototypes work identically with or without analytics configured.
export function initAnalytics(prototypeVersion) {
  if (!KEY || ready) return
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'always',
    capture_pageview: true,
    capture_pageleave: true,
  })
  posthog.register({ prototype_version: prototypeVersion })
  ready = true
}

export function track(event, props) {
  if (!ready) return
  posthog.capture(event, props)
}
