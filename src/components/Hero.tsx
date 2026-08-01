import { useCallback, useContext, useRef } from 'react'
import { HeroContext } from '../context/HeroContext'
import type { HeroProps } from '../types/navigation'

export function Hero({
  children,
  id,
  transitionOnUserGestures = true,
}: HeroProps) {
  const scope = useContext(HeroContext)
  const unregisterRef = useRef<(() => void) | null>(null)

  const setWrapper = useCallback(
    (wrapper: HTMLSpanElement | null) => {
      unregisterRef.current?.()
      unregisterRef.current = null

      const element = wrapper?.firstElementChild
      if (scope && element && 'style' in element) {
        unregisterRef.current = scope.registerHero(id, {
          element: element as HTMLElement | SVGElement,
          transitionOnUserGestures,
        })
      }
    },
    [id, scope, transitionOnUserGestures],
  )

  return (
    <span data-hero-id={id} ref={setWrapper} style={{ display: 'contents' }}>
      {children}
    </span>
  )
}
