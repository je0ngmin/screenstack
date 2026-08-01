import { useContext, useLayoutEffect } from 'react'
import { PageRouteContext } from '../../context/PageRouteContext'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useRouteEnter } from '../../hooks/useRouteEnter'
import type { PageRouteProps } from '../../types/navigation'
import { pageRouteStyle } from '../../utils/routeStyles'

export function MaterialPageRoute({
  children,
  className,
  style,
}: PageRouteProps) {
  const route = useContext(PageRouteContext)
  const entered = useRouteEnter()
  const reducedMotion = usePrefersReducedMotion()
  const exiting = route?.phase === 'exiting'

  useLayoutEffect(
    () =>
      route?.registerHeroTransition({
        pop: {
          duration: 280,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        },
        push: {
          duration: 280,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        },
      }),
    [route],
  )

  return (
    <div
      className={className}
      data-page-route="material"
      data-route-phase={route?.phase ?? 'active'}
      style={{
        ...pageRouteStyle,
        ...style,
        opacity: exiting ? 0 : entered ? 1 : 0.65,
        transform: exiting
          ? 'translate3d(0, 12px, 0) scale(0.985)'
          : entered
            ? 'translate3d(0, 0, 0) scale(1)'
            : 'translate3d(0, 18px, 0) scale(0.985)',
        transition: reducedMotion
          ? 'none'
          : 'opacity 220ms ease, transform 280ms cubic-bezier(0.2, 0, 0, 1)',
      }}
    >
      {children}
    </div>
  )
}
