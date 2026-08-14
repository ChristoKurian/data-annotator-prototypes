// Demo video: served as a static asset (see public/video), natural pixel
// size, and frame rate — used to keep the frame scrubber in sync with real
// playback time.
export const VIDEO_SRC = '/video/heavy-traffic.mp4'
export const VIDEO_SIZE = { width: 1920, height: 1080 }
export const FRAME_RATE = 25
export const TOTAL_FRAMES = 283

export const ANNOTATION_COLORS = [
  '#dc2626', // red
  '#ea580c', // orange
  '#7c3aed', // violet
  '#ca8a04', // gold
  '#16a34a', // green
  '#2563eb', // blue
  '#0891b2', // cyan
  '#db2777', // pink
]

// Labels available for chunked (label-first) annotation. `aiAvailable: false`
// means no trained model exists yet for that label, so Auto Label can't
// suggest it — surfaced as a disabled pill with an explanatory tooltip.
const RAW_LABELS = [
  { id: 'car', name: 'Car', aiAvailable: true },
  { id: 'bike', name: 'Bike', aiAvailable: true },
  { id: 'pedestrian', name: 'Pedestrian', aiAvailable: true },
  { id: 'plate', name: 'Plate', aiAvailable: true },
  { id: 'road-sign', name: 'Road Sign', aiAvailable: false },
  { id: 'traffic-light', name: 'Traffic light', aiAvailable: false },
  { id: 'vehicle', name: 'Vehicle', aiAvailable: true },
  { id: 'bus', name: 'Bus', aiAvailable: true },
  { id: 'truck', name: 'Truck', aiAvailable: true },
  { id: 'van', name: 'Van', aiAvailable: true },
  { id: 'taxi', name: 'Taxi', aiAvailable: true },
  { id: 'helmet', name: 'Helmet', aiAvailable: true },
  { id: 'traffic-cone', name: 'Traffic Cone', aiAvailable: false },
  { id: 'street-vendor', name: 'Street Vendor', aiAvailable: false },
  { id: 'cargo-basket', name: 'Cargo Basket', aiAvailable: true },
  { id: 'umbrella', name: 'Umbrella', aiAvailable: false },
  { id: 'storefront-sign', name: 'Storefront Sign', aiAvailable: true },
  { id: 'streetlamp', name: 'Streetlamp', aiAvailable: false },
  { id: 'utility-pole', name: 'Utility Pole', aiAvailable: false },
  { id: 'crosswalk', name: 'Crosswalk', aiAvailable: false },
  { id: 'overpass', name: 'Overpass', aiAvailable: false },
  { id: 'building', name: 'Building', aiAvailable: true },
  { id: 'awning', name: 'Awning', aiAvailable: true },
  { id: 'antenna', name: 'Antenna', aiAvailable: false },
  { id: 'ad-banner', name: 'Ad Banner', aiAvailable: true },
]

// Alphabetical — matches V1's ordering.
export const LABELS = [...RAW_LABELS].sort((a, b) => a.name.localeCompare(b.name))

export const LABEL_OPTIONS = LABELS.map((l) => l.name)

// One consistent color per label, so every "Car" box reads as the same
// color regardless of when it was drawn.
export const LABEL_COLORS = Object.fromEntries(
  LABELS.map((l, i) => [l.id, ANNOTATION_COLORS[i % ANNOTATION_COLORS.length]]),
)

export function labelIdByName(name) {
  return LABELS.find((l) => l.name === name)?.id
}

export const OCCLUSION_OPTIONS = ['1-50%', '50-75%', '75%-100%']

export const TOOLS = [
  { id: 'box', label: 'Box', shortcut: '1' },
  { id: 'line', label: 'Line', shortcut: '2' },
  { id: 'polygon', label: 'Polygon', shortcut: '3' },
  { id: 'landmark', label: 'Landmark', shortcut: '4' },
  { id: 'cuboid', label: 'Cuboid', shortcut: '5' },
]

// Percentages (0-100) relative to VIDEO_SIZE, used by the Auto Label demo.
export const AUTO_LABEL_SUGGESTIONS = [
  { id: 'sug-1', label: 'Car', confidence: 98, box: { x: 0, y: 51, w: 14.7, h: 25 } },
  { id: 'sug-2', label: 'Car', confidence: 97, box: { x: 14.7, y: 53, w: 16.5, h: 17 } },
  { id: 'sug-3', label: 'Car', confidence: 97, box: { x: 31.2, y: 51, w: 11.8, h: 14 } },
  { id: 'sug-4', label: 'Vehicle', confidence: 93, box: { x: 43.6, y: 52, w: 26.8, h: 39 } },
  { id: 'sug-5', label: 'Vehicle', confidence: 93, box: { x: 70.4, y: 50, w: 24.3, h: 28 } },
  { id: 'sug-6', label: 'Car', confidence: 88, box: { x: 92.3, y: 54, w: 7.7, h: 46 } },
  { id: 'sug-7', label: 'Car', confidence: 76, box: { x: 49.3, y: 49, w: 4.4, h: 5 } },
  { id: 'sug-8', label: 'Pedestrian', confidence: 61, box: { x: 59.9, y: 76, w: 10, h: 17 } },
]

export function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
