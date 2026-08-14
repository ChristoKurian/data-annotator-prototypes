import { useEffect, useRef, useState } from 'react'

// Measures a container and returns the rect (relative to the container's
// top-left corner) that an image with `naturalSize` would occupy if it were
// rendered with `object-fit: contain` inside it. Lets us keep the overlay
// coordinate math (percentages of the image) exactly aligned with the
// rendered <img>, no matter how the surrounding layout resizes.
export function useContainRect(naturalSize) {
  const containerRef = useRef(null)
  const [rect, setRect] = useState({ x: 0, y: 0, width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const compute = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (!cw || !ch) return
      const imageRatio = naturalSize.width / naturalSize.height
      const containerRatio = cw / ch
      let width
      let height
      if (containerRatio > imageRatio) {
        height = ch
        width = ch * imageRatio
      } else {
        width = cw
        height = cw / imageRatio
      }
      setRect({ x: (cw - width) / 2, y: (ch - height) / 2, width, height })
    }

    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(el)
    return () => observer.disconnect()
  }, [naturalSize.width, naturalSize.height])

  return { containerRef, rect }
}
