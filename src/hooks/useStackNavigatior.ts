import { useContext } from 'react'
import { StackNavigationContext } from '../context/StackNavigationContext'
import type { StackNavigation } from '../types/navigation'

export function useStackNavigatior(): StackNavigation {
  const navigator = useContext(StackNavigationContext)

  if (!navigator) {
    throw new Error(
      'useStackNavigatior must be used within a StackNavigator.',
    )
  }

  return navigator
}
