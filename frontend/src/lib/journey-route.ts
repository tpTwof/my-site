type Point = { x: number; y: number }
type Stop = Point & { height: number }

/** 绘制、鼠标投影和返程共用同一条折线，避免圆点在折角处走捷径。 */
export function createJourneyRoute(stops: readonly Stop[]) {
  let length = 0
  const distances = [0]
  const segments: { from: Point; to: Point; start: number; length: number }[] = []
  const vertices: Point[] = stops.length ? [{ x: stops[0].x, y: stops[0].y }] : []

  function append(to: Point) {
    const from = vertices[vertices.length - 1]
    const segmentLength = Math.hypot(to.x - from.x, to.y - from.y)
    if (segmentLength > 0) segments.push({ from, to, start: length, length: segmentLength })
    length += segmentLength
    vertices.push(to)
  }

  stops.forEach((stop, index) => {
    const next = stops[index + 1]
    if (!next) return
    append({ x: stop.x, y: stop.y + stop.height + 56 })
    append(next)
    distances.push(length)
  })

  return {
    path: vertices.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '),
    length,
    stops: distances,
    at(distance: number): Point {
      const clamped = Math.max(0, Math.min(length, distance))
      const segment = segments.find(part => clamped <= part.start + part.length)
      if (!segment) return vertices[0] ?? { x: 0, y: 0 }
      const t = (clamped - segment.start) / segment.length
      return { x: segment.from.x + (segment.to.x - segment.from.x) * t, y: segment.from.y + (segment.to.y - segment.from.y) * t }
    },
    project(point: Point) {
      let nearest = 0
      let minimum = Infinity
      for (const segment of segments) {
        const dx = segment.to.x - segment.from.x
        const dy = segment.to.y - segment.from.y
        const t = Math.max(0, Math.min(1, ((point.x - segment.from.x) * dx + (point.y - segment.from.y) * dy) / segment.length ** 2))
        const error = (point.x - segment.from.x - dx * t) ** 2 + (point.y - segment.from.y - dy * t) ** 2
        if (error < minimum) {
          minimum = error
          nearest = segment.start + t * segment.length
        }
      }
      return nearest
    },
  }
}
