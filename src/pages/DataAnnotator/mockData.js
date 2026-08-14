// Demo video: served as a static asset (see public/video), natural pixel
// size, and frame rate — used to keep the frame scrubber in sync with real
// playback time.
export const VIDEO_SRC = '/video/heavy-traffic.mp4'
export const VIDEO_SIZE = { width: 1920, height: 1080 }
export const FRAME_RATE = 25
export const TOTAL_FRAMES = 283

export const ANNOTATION_COLORS = [
  '#22c55e', // green
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
  '#eab308', // yellow
  '#ef4444', // red
]

export const LABEL_OPTIONS = [
  'Car',
  'Bike',
  'Pedestrian',
  'Plate',
  'Road Sign',
  'Traffic light',
  'Vehicle',
]

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
  { id: 'sug-1', label: 'car', confidence: 98, box: { x: 0, y: 51, w: 14.7, h: 25 } },
  { id: 'sug-2', label: 'car', confidence: 97, box: { x: 14.7, y: 53, w: 16.5, h: 17 } },
  { id: 'sug-3', label: 'car', confidence: 97, box: { x: 31.2, y: 51, w: 11.8, h: 14 } },
  { id: 'sug-4', label: 'car', confidence: 93, box: { x: 43.6, y: 52, w: 26.8, h: 39 } },
  { id: 'sug-5', label: 'car', confidence: 93, box: { x: 70.4, y: 50, w: 24.3, h: 28 } },
  { id: 'sug-6', label: 'car', confidence: 88, box: { x: 92.3, y: 54, w: 7.7, h: 46 } },
  { id: 'sug-7', label: 'car', confidence: 76, box: { x: 49.3, y: 49, w: 4.4, h: 5 } },
  { id: 'sug-8', label: 'person', confidence: 61, box: { x: 59.9, y: 76, w: 10, h: 17 } },
]

export function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
