import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { OfficeDurationHmsDisplay } from './OfficeDurationHmsDisplay'
import './officeWaterClock.css'
import { officeWaterProgress } from '../lib/officeWaterLevel'

/** Water height is visual only; recorded time is never capped. */
export function OfficeWaterClock({totalSec,live}:{totalSec:number;live:boolean}) {
  const root = useRef<HTMLDivElement>(null)
  const sequence = useRef(0)
  const [clearance, setClearance] = useState(48)
  const [ripples, setRipples] = useState<{id:number;x:number;y:number;size:number}[]>([])
  useEffect(() => {
    const card = root.current?.closest('.office-water-card')
    if (!card) return
    const header = card.querySelector('.gs-section-title')
    const measure = () => {
      if (header && root.current) setClearance(Math.max(0, header.getBoundingClientRect().bottom - root.current.getBoundingClientRect().top + 12))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    if (header) observer.observe(header)
    measure()
    const click = (event: Event) => {
      const pointer = event as MouseEvent
      const bounds = root.current!.getBoundingClientRect()
      setRipples(previous => [...previous.slice(-7), {id:++sequence.current,x:pointer.clientX-bounds.left,y:pointer.clientY-bounds.top,size:Math.hypot(bounds.width,bounds.height)*2}])
    }
    card.addEventListener('click', click)
    return () => { observer.disconnect(); card.removeEventListener('click', click) }
  }, [])
  const progress = officeWaterProgress(totalSec)
  const level = `calc(${progress * 100}% - ${clearance * progress}px)`
  const full = progress >= 1
  const second=Math.floor(totalSec)
  return <div ref={root} className="office-water-clock" data-running={live || full} data-full={full}>
    <div className="office-water-vessel" style={{'--water-level':level} as CSSProperties}>
      <div className="office-water-fill"><span className="office-water-surface"/><span className="office-water-surface office-water-surface--back"/>{live&&!full&&[second-1,second].map(tick=><span key={tick} className="office-water-impact" aria-hidden><i/><i/></span>)}</div>
      {live&&!full&&<span key={second} className="office-water-drop" aria-hidden style={{'--fall':`calc(${(1-progress)*100}% + ${clearance*progress}px)`} as CSSProperties}/>}
      <div className="office-water-reading"><OfficeDurationHmsDisplay totalSec={totalSec} live={live}/></div>
      {ripples.map(ripple => <span key={ripple.id} className="office-click-ripple" aria-hidden style={{left:ripple.x,top:ripple.y,'--ripple-size':`${ripple.size}px`} as CSSProperties} onAnimationEnd={() => setRipples(previous=>previous.filter(item=>item.id!==ripple.id))}><i/></span>)}
    </div>
  </div>
}
