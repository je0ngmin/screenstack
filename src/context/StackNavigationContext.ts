import { createContext } from 'react'
import type { StackNavigation } from '../types/navigation'

export const StackNavigationContext =
  createContext<StackNavigation | null>(null)
