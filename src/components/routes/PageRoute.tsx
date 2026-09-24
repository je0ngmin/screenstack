import { useLayoutEffect } from 'react'
import { usePageRouteTransition } from '../../hooks/usePageRouteTransition'
import type { PageRouteProps } from '../../types/navigation'
import { pageRouteStyle } from '../../utils/routeStyles'

export function PageRoute({ children, className, style }: PageRouteProps) {
  const route = usePageRouteTransition()

  useLayoutEffect(
    () =>
      route.registerTransition({
        pop: { duration: 0, easing: 'linear' },
        push: { duration: 0, easing: 'linear' },
      }),
    [route],
  )

  return (
    <div
      className={className}
      data-page-route="default"
      style={{
        ...pageRouteStyle,
        animation: 'none',
        transition: 'none',
        willChange: 'auto',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
