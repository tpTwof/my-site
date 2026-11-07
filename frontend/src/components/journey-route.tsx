import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createJourneyRoute } from '@/lib/journey-route'

type Geometry = { width: number; height: number; points: { x: number; y: number; height: number }[] }
const METEOR_INTERVAL = 3
const METEOR_LAYERS = ['tail', 'trail', 'core', 'flare', 'head']

export function JourneyRoute({ geometry, containerRef, loading, launchMeteors }: {
  geometry: Geometry
  containerRef: RefObject<HTMLOListElement | null>
  loading: boolean
  launchMeteors: boolean
}) {
  const tracerRef = useRef<HTMLLIElement>(null)
  const meteorPathId = useId()
  const route = useMemo(() => createJourneyRoute(geometry.points), [geometry.points])
  const [meteors, setMeteors] = useState<{ count: number; duration: number; tail: number }>()

  useEffect(() => {
    const container = containerRef.current
    if (!launchMeteors || meteors || !route.length || !container) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      const arrival = Math.max(4.5, route.length / 125)
      const tail = Math.min(18, (110 / route.length) * 100)
      // The head reaches the endpoint before the tail has fully cleared it.
      setMeteors({ count: Math.ceil(arrival / METEOR_INTERVAL), duration: arrival * (102 + tail) / 101, tail })
      observer.disconnect()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, launchMeteors, route.length, meteors])

  useEffect(() => {
    const container = containerRef.current
    const tracer = tracerRef.current
    if (!container || !tracer || !route.length) return
    let pointerId: number | null = null
    let distance = 0
    let frame = 0
    let pointer = { x: 0, y: 0 }
    const nodes = Array.from(container.querySelectorAll<HTMLElement>('.map-node'))
    const finalStart = route.stops[route.stops.length - 2] ?? 0
    const finalLength = route.length - finalStart
    let arrivedNode: HTMLElement | null = null

    function markArrival(node: HTMLElement | null) {
      if (node === arrivedNode) return
      arrivedNode?.removeAttribute('data-route-arrival')
      arrivedNode = node
      if (node) node.dataset.routeArrival = 'true'
    }

    function show(nextDistance: number) {
      const stopIndex = route.stops.findIndex(stop => Math.abs(stop - nextDistance) <= 8)
      distance = stopIndex >= 0 ? route.stops[stopIndex] : nextDistance
      markArrival(stopIndex >= 0 ? nodes[stopIndex] ?? null : null)
      const point = route.at(distance)
      tracer!.style.transform = `translate3d(${point.x}px,${point.y}px,0) translate(-50%,-50%)`
      // 按最后一段折线的实际路程渐变，返程时自动从红色过渡回绿色。
      const endProgress = finalLength > 0 ? Math.max(0, Math.min(1, (distance - finalStart) / finalLength)) : 0
      tracer!.style.setProperty('--route-end-progress', `${endProgress * 100}%`)
    }

    function hide() {
      markArrival(null)
      tracer!.removeAttribute('data-visible')
      tracer!.style.removeProperty('--route-end-progress')
      container!.removeAttribute('data-tracing')
      container!.removeAttribute('data-dragging-route')
    }

    function followPointer() {
      const bounds = container!.getBoundingClientRect()
      show(route.project({ x: pointer.x - bounds.left, y: pointer.y - bounds.top }))
    }

    function release() {
      if (pointerId === null) return
      const released = pointerId
      pointerId = null
      container!.removeAttribute('data-dragging-route')
      if (container!.hasPointerCapture(released)) container!.releasePointerCapture(released)
      const startDistance = distance
      const duration = Math.min(2400, Math.max(300, startDistance / .65))
      let start: number | undefined
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        show(0)
        hide()
        return
      }
      function returnHome(time: number) {
        start ??= time
        const progress = Math.min(1, (time - start) / duration)
        show(startDistance * (1 - progress) ** 2)
        if (progress < 1) {
          frame = requestAnimationFrame(returnHome)
        } else {
          frame = 0
          hide()
        }
      }
      frame = requestAnimationFrame(returnHome)
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0 || pointerId !== null) return
      if (!(event.target instanceof Element)) return
      const node = event.target.closest<HTMLElement>('.map-node')
      if (!node && !event.target.closest('.map-route-hit')) return
      event.preventDefault()
      cancelAnimationFrame(frame)
      frame = 0
      pointerId = event.pointerId
      pointer = { x: event.clientX, y: event.clientY }
      if (node) show(route.stops[Number(node.dataset.routeIndex)] ?? 0)
      else followPointer()
      tracer!.dataset.visible = 'true'
      container!.dataset.tracing = 'true'
      container!.dataset.draggingRoute = 'true'
      container!.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerId !== pointerId) return
      if (!(event.buttons & 1)) { release(); return }
      pointer = { x: event.clientX, y: event.clientY }
      followPointer()
    }

    function onPointerEnd(event: PointerEvent) {
      if (event.pointerId === pointerId) release()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') release()
    }

    function onScroll() {
      if (pointerId !== null) followPointer()
    }

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerup', onPointerEnd)
    container.addEventListener('pointercancel', onPointerEnd)
    container.addEventListener('lostpointercapture', onPointerEnd)
    window.addEventListener('blur', release)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      const captured = pointerId
      pointerId = null
      cancelAnimationFrame(frame)
      if (captured !== null && container.hasPointerCapture(captured)) container.releasePointerCapture(captured)
      hide()
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', onPointerEnd)
      container.removeEventListener('pointercancel', onPointerEnd)
      container.removeEventListener('lostpointercapture', onPointerEnd)
      window.removeEventListener('blur', release)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [containerRef, route])

  return (
    <>
      <li aria-hidden="true" className="map-lines">
        <svg width={geometry.width} height={geometry.height}>
          <path d={route.path} />
          {loading && <path className="map-route-loading" d={route.path} pathLength={100} />}
          {meteors && (
            <g className="map-route-meteors" style={{ '--meteor-tail': `${meteors.tail}px`, '--meteor-duration': `${meteors.duration}s` } as CSSProperties}>
              <defs><path id={meteorPathId} d={route.path} pathLength={100} /></defs>
              {Array.from({ length: meteors.count }, (_, index) => (
                <g key={index} className="map-route-meteor" style={{ '--meteor-delay': `${index * METEOR_INTERVAL}s` } as CSSProperties}>
                  {METEOR_LAYERS.map(layer => <use key={layer} className={`map-meteor-${layer}`} href={`#${meteorPathId}`} />)}
                </g>
              ))}
            </g>
          )}
          <path className="map-route-hit" d={route.path} />
        </svg>
      </li>
      <li ref={tracerRef} aria-hidden="true" className="map-route-tracer" />
    </>
  )
}
