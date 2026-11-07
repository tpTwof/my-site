import { useEffect, useState, type CSSProperties } from 'react'
import { JourneyMap } from '@/components/journey-map'
import { ElasticAboutHeading } from '@/components/elastic-about-heading'
import './home.css'

const WELCOME = 'Welcome to tpTwo'
// 只有文档最初就在首页时才播放。直接打开其他页面后站内进入首页也不播放。
// 浏览器刷新会重新执行模块；Link 跳转和历史前进后退不会重置此标记。
const enteredOnHome = /^\/(home\/?)?$/.test(window.location.pathname)
let introVisited = !enteredOnHome
type Phase = 'fly' | 'wave' | 'reveal' | 'done'
function initialPhase(): Phase {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'done'
  return introVisited ? 'done' : 'fly'
}

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>(initialPhase)
  useEffect(() => {
    introVisited = true
  }, [])
  useEffect(() => {
    const root = document.documentElement
    root.dataset.homeSurface = phase === 'done' ? 'dark' : phase === 'reveal' ? 'reveal' : 'light'
    const previousOverflow = document.body.style.overflow
    if (phase !== 'done') document.body.style.overflow = 'hidden'
    return () => {
      delete root.dataset.homeSurface
      document.body.style.overflow = previousOverflow
    }
  }, [phase])

  return (
    <>
      {phase !== 'done' && (
        <div className="home-intro">
          <h1 aria-label={WELCOME} className={`home-welcome home-welcome--${phase}`}>
            {Array.from(WELCOME).map((letter, index) => (
              <span
                key={index}
                aria-hidden="true"
                style={{ '--i': index, '--from-x': `${Math.cos(index * 2.4) * 150}vw`, '--from-y': `${Math.sin(index * 2.4) * 150}vh`, '--turn': `${(index % 2 ? 1 : -1) * (90 + index * 12)}deg` } as CSSProperties}
                onAnimationEnd={index === WELCOME.length - 1 ? () => {
                  if (phase === 'fly') setPhase('wave')
                  if (phase === 'wave') setPhase('reveal')
                } : undefined}
              >{letter === ' ' ? '\u00a0' : letter}</span>
            ))}
          </h1>
          <button className="home-skip" onClick={() => setPhase('done')}>跳过动画</button>
        </div>
      )}

      {/* 让路程请求与开场并行，正文在揭幕前保持隐藏。 */}
      <div hidden={phase === 'fly' || phase === 'wave'} className={`about-home ${phase === 'reveal' ? 'home-curtain' : ''}`} onAnimationEnd={phase === 'reveal' ? (event) => {
        if (event.target === event.currentTarget && event.animationName === 'home-open') setPhase('done')
      } : undefined}>
        <section className="about-heading">
          <p className="about-eyebrow">THE PERSON BEHIND THE WORDS</p>
          <ElasticAboutHeading />
          <p className="about-lead">我是 tpTwo<br />在这里，留下一些思考与足迹</p>
          <a className="about-scroll" href="#journey">时间长廊<span aria-hidden="true">↓</span></a>
        </section>
        <section id="journey" className="about-journey" aria-label="我的路程">
          <JourneyMap readyForMeteors={phase === 'done'} />
        </section>
        <footer className="about-footer"><span>tpTwo / 一路向前</span><a href="#journey">↑</a></footer>
      </div>
    </>
  )
}
