import { useContext } from 'react'
import { PageRouteContext } from '../context/PageRouteContext'

export function usePageRouteTransition() {
  const route = useContext(PageRouteContext)

  if (!route) {
    throw new Error(
      'usePageRouteTransition must be used inside a StackNavigator screen.',
    )
  }

  return route
}
