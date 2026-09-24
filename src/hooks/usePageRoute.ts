import { useContext } from 'react'
import { PageRouteContext } from '../context/PageRouteContext'
import type { PageRouteState } from '../types/navigation'

export function usePageRoute(): PageRouteState {
  const route = useContext(PageRouteContext)

  if (!route) {
    throw new Error(
      'usePageRoute must be used within a StackNavigator screen.',
    )
  }

  return {
    canPop: route.canPop,
    id: route.id,
    isActive: route.isActive,
    position: route.position,
    transitionStatus: route.transitionStatus,
  }
}
