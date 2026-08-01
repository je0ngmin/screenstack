import type {
  CSSProperties,
  ReactElement,
  ReactNode,
  RefObject,
} from 'react'

export type PageRoutePlatform = 'ios' | 'android'
export type PageRoutePhase = 'active' | 'covered' | 'exiting'

export interface HeroTransitionTiming {
  duration: number
  easing: string
}

export interface PageRouteHeroTransitionConfig {
  pop: HeroTransitionTiming
  push: HeroTransitionTiming
}

export interface PageRouteProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export interface CupertinoPageRouteProps extends PageRouteProps {
  edgeWidth?: number
  swipeBackEnabled?: boolean
}

export interface CupertinoZoomTransitionPageRouteProps
  extends CupertinoPageRouteProps {
  sourceRef: RefObject<HTMLElement | null>
  transitionDuration?: number
}

export interface AdaptivePageRouteProps extends CupertinoPageRouteProps {
  platform?: PageRoutePlatform
}

export interface HeroProps {
  children: ReactElement
  id: string
  transitionOnUserGestures?: boolean
}

export interface PageRouteTransition {
  canPop: boolean
  cancelPopGesture: (duration?: number) => void
  completePopGesture: (duration?: number) => void
  phase: PageRoutePhase
  popGestureInProgress: boolean
  registerHeroTransition: (
    config: PageRouteHeroTransitionConfig,
  ) => () => void
  startPopGesture: () => boolean
  updatePopGesture: (progress: number) => void
}

export interface StackScreen {
  id: string
  element: ReactNode
}

export interface StackNavigation {
  canGoBack: boolean
  push: (element: ReactNode, id?: string) => void
  pop: () => void
  replace: (element: ReactNode, id?: string) => void
  reset: (element: ReactNode, id?: string) => void
}

export interface StackNavigationState extends StackNavigation {
  isActive: boolean
}

export type StackNavigationRef = RefObject<StackNavigation | null>

export interface StackNavigatorProps {
  children?: ReactNode
  className?: string
  initialScreen?: ReactNode
}
