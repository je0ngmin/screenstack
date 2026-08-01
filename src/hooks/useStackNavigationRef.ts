import { useRef } from 'react'
import type {
  StackNavigation,
  StackNavigationRef,
} from '../types/navigation'

export function useStackNavigationRef(): StackNavigationRef {
  return useRef<StackNavigation>(null)
}
