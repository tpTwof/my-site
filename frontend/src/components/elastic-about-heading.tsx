import { useEffect, useRef } from 'react'

const LETTERS = Array.from('About me')
const LAST = LETTERS.length
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** A 是锚点；句点由鼠标牵引，字母以不同的惯性跟随句点。 */
export function ElasticAboutHeading() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dotRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const heading = headingRef.current!
    const dot = dotRef.current!
    const letters = Array.from(heading.querySelectorAll<HTMLElement>('[data-elastic-letter]'))
    const dotShape = dot.querySelector<HTMLElement>('.about-elastic-dot-shape')!
    const nodes = [...letters, dot]
    const bodies = nodes.map(() => ({ x: 0, velocity: 0 }))
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let lastFrame = 0
    let pointerId: number | null = null
    let pointerX = 0
    let pointerTime = 0
    let pointerVelocity = 0
    let grabX = 0
    let target = 0
    let minPull = 0
    let maxPull = 0
    let scale = 1
    let scaleVelocity = 0
    let dotWidth = 1
    let restRight = 0
    let waves: Animation[] = []

    function cancelWaves() {
      waves.forEach(animation => animation.cancel())
      waves = []
    }

    function reset() {
      cancelAnimationFrame(frame)
      frame = 0
      lastFrame = 0
      target = pointerVelocity = scaleVelocity = 0
      scale = 1
      bodies.forEach(body => { body.x = body.velocity = 0 })
      nodes.forEach(node => { node.style.transform = '' })
      dotShape.style.transform = ''
      cancelWaves()
    }

    function tick(time: number) {
      const elapsed = lastFrame ? Math.min((time - lastFrame) / 1000, .032) : 1 / 60
      lastFrame = time
      // 小步积分保证不同刷新率、切回后台标签时都不会突然弹飞。
      const steps = Math.ceil(elapsed / (1 / 120))
      const dt = elapsed / steps
      for (let step = 0; step < steps; step++) {
        const end = bodies[LAST]
        const damping = motionPreference.matches ? 46 : 25
        end.velocity += ((target - end.x) * 360 - end.velocity * damping) * dt
        end.x += end.velocity * dt
        for (let index = 1; index < LAST; index++) {
          const body = bodies[index]
          const weight = Math.pow(index / (LAST - 1), 1.25)
          const stiffness = 150 + index * 22
          body.velocity += ((end.x * weight - body.x) * stiffness - body.velocity * damping) * dt
          body.x += body.velocity * dt
        }
        // 左端绑定 e，右端保留牵引惯性；两端位移和速度差共同形成可见的拉伸。
        pointerVelocity *= Math.exp(-dt * 16)
        const tail = bodies[LAST - 1]
        const extension = Math.abs(end.x - tail.x) / dotWidth
        const speedDifference = Math.abs(pointerVelocity - tail.velocity) / 900
        const availableScale = Math.max(1, 1 + (window.innerWidth - restRight - tail.x - 24) / dotWidth)
        const desiredScale = motionPreference.matches ? 1 : Math.min(availableScale, 1 + Math.min(6, extension + speedDifference))
        scaleVelocity += ((desiredScale - scale) * 420 - scaleVelocity * 30) * dt
        scale += scaleVelocity * dt
        if (scale > availableScale) {
          scale = availableScale
          scaleVelocity = Math.min(0, scaleVelocity)
        }
      }
      for (let index = 1; index < LAST; index++) {
        nodes[index].style.transform = `translate3d(${bodies[index].x}px,0,0)`
      }
      dot.style.transform = `translate3d(${bodies[LAST - 1].x}px,0,0)`
      dotShape.style.transform = `scale(${scale},${Math.max(.6, 1 / Math.sqrt(scale))})`

      const moving = bodies.some(body => Math.abs(body.x) > .05 || Math.abs(body.velocity) > .1)
      if (pointerId !== null || moving || Math.abs(scale - 1) > .001 || Math.abs(scaleVelocity) > .01) {
        frame = requestAnimationFrame(tick)
      } else {
        // 精确归零，避免动画结束后残留小数像素偏移。
        nodes.forEach(node => { node.style.transform = '' })
        dotShape.style.transform = ''
        bodies.forEach(body => { body.x = body.velocity = 0 })
        scale = 1
        scaleVelocity = 0
        frame = lastFrame = 0
      }
    }

    function start() {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    function measureLimits() {
      const width = heading.getBoundingClientRect().width
      dotWidth = Math.max(1, dot.offsetWidth)
      restRight = heading.getBoundingClientRect().left + dot.offsetLeft + dotWidth
      minPull = -width * .1
      maxPull = Math.max(0, Math.min(width * .85, window.innerWidth - restRight - 24))
    }

    function release() {
      const wasDragging = pointerId !== null
      const releasedPointer = pointerId
      pointerId = null
      delete dot.dataset.dragging
      if (releasedPointer !== null && dot.hasPointerCapture(releasedPointer)) dot.releasePointerCapture(releasedPointer)
      if (!wasDragging && target === 0) return
      const distance = Math.abs(bodies[LAST].x)
      target = pointerVelocity = 0
      cancelWaves()
      if (!motionPreference.matches && distance > 2) {
        const amplitude = clamp(distance * .15, 5, 24)
        // 沿用 Welcome 的上扬、轻微下落、归位节奏，波浪从句点传向锚点。
        nodes.slice(1).forEach((node, index) => {
          const glyph = node.firstElementChild!
          waves.push(glyph.animate([
            { transform: 'translate(0,0)', offset: 0 },
            { transform: `translate(${amplitude * .35}px,${-amplitude}px)`, offset: .4 },
            { transform: `translate(${amplitude * .12}px,${amplitude * .25}px)`, offset: .7 },
            { transform: 'translate(0,0)', offset: 1 },
          ], { duration: 750, delay: Math.max(0, LAST - index - 2) * 40, easing: 'ease-in-out' }))
        })
      }
      start()
    }

    function onPointerDown(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0 || pointerId !== null) return
      event.preventDefault()
      cancelWaves()
      measureLimits()
      pointerId = event.pointerId
      pointerX = event.clientX
      pointerTime = event.timeStamp
      grabX = event.clientX - bodies[LAST].x
      target = bodies[LAST].x
      pointerVelocity = 0
      dot.dataset.dragging = 'true'
      dot.setPointerCapture(event.pointerId)
      start()
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerId !== pointerId) return
      const dt = Math.max((event.timeStamp - pointerTime) / 1000, .008)
      pointerVelocity = clamp((event.clientX - pointerX) / dt, -4000, 4000)
      target = clamp(event.clientX - grabX, minPull, maxPull)
      pointerX = event.clientX
      pointerTime = event.timeStamp
    }

    function onPointerEnd(event: PointerEvent) {
      if (event.pointerId === pointerId) release()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        release()
      } else if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && pointerId === null) {
        event.preventDefault()
        measureLimits()
        cancelWaves()
        target = clamp(target + (event.key === 'ArrowRight' ? 24 : -24), minPull, maxPull)
        start()
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') release()
    }

    function onResize() {
      release()
      reset()
    }

    dot.addEventListener('pointerdown', onPointerDown)
    dot.addEventListener('pointermove', onPointerMove)
    dot.addEventListener('pointerup', onPointerEnd)
    dot.addEventListener('pointercancel', onPointerEnd)
    dot.addEventListener('lostpointercapture', onPointerEnd)
    dot.addEventListener('keydown', onKeyDown)
    dot.addEventListener('keyup', onKeyUp)
    dot.addEventListener('blur', release)
    window.addEventListener('blur', release)
    window.addEventListener('resize', onResize)
    motionPreference.addEventListener('change', onResize)
    return () => {
      release()
      reset()
      dot.removeEventListener('pointerdown', onPointerDown)
      dot.removeEventListener('pointermove', onPointerMove)
      dot.removeEventListener('pointerup', onPointerEnd)
      dot.removeEventListener('pointercancel', onPointerEnd)
      dot.removeEventListener('lostpointercapture', onPointerEnd)
      dot.removeEventListener('keydown', onKeyDown)
      dot.removeEventListener('keyup', onKeyUp)
      dot.removeEventListener('blur', release)
      window.removeEventListener('blur', release)
      window.removeEventListener('resize', onResize)
      motionPreference.removeEventListener('change', onResize)
    }
  }, [])

  return (
    <h1 ref={headingRef} className="about-elastic-title" aria-label="About me.">
      {LETTERS.map((letter, index) => (
        <span key={index} data-elastic-letter aria-hidden="true" className="about-elastic-letter">
          <span className="about-elastic-glyph">{letter === ' ' ? '\u00a0' : letter}</span>
        </span>
      ))}
      <button ref={dotRef} type="button" className="about-elastic-dot" aria-label="拖动句点拉伸标题；也可按住左右方向键，松开回弹">
        <span className="about-elastic-glyph" aria-hidden="true"><span className="about-elastic-dot-shape">.</span></span>
      </button>
    </h1>
  )
}
