import type { PageRouteProps } from '../../types/navigation'
import { pageRouteStyle } from '../../utils/routeStyles'

export function PageRoute({ children, className, style }: PageRouteProps) {
  return (
    <div
      className={className}
      data-page-route="default"
      style={{ ...pageRouteStyle, ...style }}
    >
      {children}
    </div>
  )
}
