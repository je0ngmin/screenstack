import { createContext } from 'react'
import type { PageRouteTransition } from '../types/navigation'

export const PageRouteContext = createContext<PageRouteTransition | null>(null)
