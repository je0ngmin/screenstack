import { createContext } from 'react'
import type { StackNavigationState } from '../types/navigation'

export const StackNavigationContext =
  createContext<StackNavigationState | null>(null)
