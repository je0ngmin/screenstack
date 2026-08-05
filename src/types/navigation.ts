import type {
  CSSProperties,
  ReactElement,
  ReactNode,
  RefObject,
} from 'react'

export type PageRoutePlatform = 'ios' | 'android'
export type PageRoutePhase = 'active' | 'covered' | 'exiting'
export type PageRouteTransitionCurve = (progress: number) => number

export interface PageRouteTransitionTiming {
  curve?: PageRouteTransitionCurve
  duration: number
  easing: string
}

/** @deprecated Use PageRouteTransitionTiming. */
export type HeroTransitionTiming = PageRouteTransitionTiming

export interface PageRouteTransitionConfig {
  prepareHeroMeasurement?: () => void | (() => void)
  pop: PageRouteTransitionTiming
  push: PageRouteTransitionTiming
}

/** @deprecated Use PageRouteTransitionConfig. */
export type PageRouteHeroTransitionConfig = PageRouteTransitionConfig

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

export interface PageRoutePopGesture {
  cancel: (duration?: number) => void
  complete: (duration?: number) => void
  update: (progress: number) => void
}

export interface PageRouteTransition {
  beginPopGesture: () => PageRoutePopGesture | null
  canPop: boolean
  /** @deprecated Use the controller returned by beginPopGesture(). */
  cancelPopGesture: (duration?: number) => void
  /** @deprecated Use the controller returned by beginPopGesture(). */
  completePopGesture: (duration?: number) => void
  phase: PageRoutePhase
  popGestureInProgress: boolean
  registerTransition: (
    config: PageRouteTransitionConfig,
  ) => () => void
  /** @deprecated Use registerTransition. */
  registerHeroTransition: (
    config: PageRouteTransitionConfig,
  ) => () => void
  /** @deprecated Use beginPopGesture(). */
  startPopGesture: () => boolean
  /** @deprecated Use the controller returned by beginPopGesture(). */
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
