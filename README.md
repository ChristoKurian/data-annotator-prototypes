# Data Annotator Prototypes

Two interactive prototypes of a video/image data-annotation tool, built to compare a baseline flow (V1) against a redesigned flow (V2) informed by a UX case study on annotator productivity.

- **V1** (`/`) — baseline flow: draw a shape, then pick its label from a search popup.
- **V2** (`/v2.html`) — "chunking" flow: pick a label first, then draw every instance of it in a row; auto-visibility narrows the canvas to whatever label you're actively annotating.

Both pages share the same demo video, shadcn/ui component set, and dark theme, and are instrumented with [PostHog](https://posthog.com) (session replay, heatmaps, and a shared event schema — `annotation_created`, `task_submitted`, etc. — tagged with `prototype_version`) so usage between the two can be compared directly.

## Getting started

```bash
npm install
npm run dev
```

- V1: http://localhost:5173/
- V2: http://localhost:5173/v2.html

## Analytics

Copy `.env.example` to `.env.local` and set `VITE_POSTHOG_KEY` (from PostHog → Project Settings → Project API Key) to enable tracking. Without it, both prototypes run identically with analytics fully disabled — no code changes needed either way.

If deploying, set `VITE_POSTHOG_KEY` (and `VITE_POSTHOG_HOST` if not on US cloud) as an environment variable on the hosting platform too — `.env.local` is gitignored and won't travel with the repo.

## Build

```bash
npm run build
```

Outputs both `index.html` and `v2.html` as separate entry points to `dist/`.
