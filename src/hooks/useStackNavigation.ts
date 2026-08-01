import { useContext } from 'react'
import { StackNavigationContext } from '../context/StackNavigationContext'
import type { StackNavigationState } from '../types/navigation'

export function useStackNavigation(): StackNavigationState {
  const navigation = useContext(StackNavigationContext)

  if (!navigation) {
    throw new Error(
      'useStackNavigation must be used within a StackNavigator.',
    )
  }

  return navigation
}
