import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { usePageRouteTransition } from '../../hooks/usePageRouteTransition'
import { useRouteEnter } from '../../hooks/useRouteEnter'
import type {
  CupertinoPageRouteProps,
  PageRoutePopGesture,
} from '../../types/navigation'
import { pageRouteStyle } from '../../utils/routeStyles'
import { isInsideHorizontalScrollArea } from '../../utils/swipeGesture'
import { createCubicBezierCurve } from '../../utils/transitionCurve'
import { InteractionGuard } from '../InteractionGuard'

const SWIPE_COMPLETION_RATIO = 0.33
const SWIPE_COMPLETION_VELOCITY = 0.5
const PUSH_TRANSITION_DURATION = 250
const POP_TRANSITION_DURATION = 350
const INTERACTIVE_TRANSITION_DURATION = 100
const TRANSITION_EASING = 'cubic-bezier(.45,.75,.65,1.02)'
const TRANSITION_CURVE = createCubicBezierCurve(0.45, 0.75, 0.65, 1.02)
const SWIPE_ACTIVATION_DISTANCE = 6
const PREVIOUS_ROUTE_OFFSET = 24
const HERO_TRANSITION_CONFIG = {
  pop: {
    curve: TRANSITION_CURVE,
    duration: POP_TRANSITION_DURATION,
    easing: TRANSITION_EASING,
  },
  push: {
    curve: TRANSITION_CURVE,
    duration: PUSH_TRANSITION_DURATION,
    easing: TRANSITION_EASING,
  },
}

interface DragState {
  active: boolean
  gesture: PageRoutePopGesture | null
  lastTime: number
  lastX: number
  pointerId: number
  startX: number
  startY: number
  velocity: number
  width: number
}

interface SavedPreviousScreenStyle {
  transform: string
  transformOrigin: string
  transition: string
  willChange: string
}

interface ScreenSize {
  height: number
  width: number
}

interface ResolvedCornerRadius {
  bottom: number
  left: number
  right: number
  top: number
}

function createContinuousCornerMask(
  { height, width }: ScreenSize,
  requestedRadius: ResolvedCornerRadius,
) {
  const horizontalScale = Math.min(
    1,
    width / Math.max(1, requestedRadius.left + requestedRadius.right),
  )
  const verticalScale = Math.min(
    1,
    height / Math.max(1, requestedRadius.top + requestedRadius.bottom),
  )
  const left = requestedRadius.left * horizontalScale
  const right = requestedRadius.right * horizontalScale
  const top = requestedRadius.top * verticalScale
  const bottom = requestedRadius.bottom * verticalScale

  const leftControl = left * 0.6
  const rightControl = right * 0.6
  const topControl = top * 0.6
  const bottomControl = bottom * 0.6
  
  const path = [
    `M ${left} 0`,
    `H ${width - right}`,
    `C ${width - right + rightControl} 0 ${width} ${top - topControl} ${width} ${top}`,
    `V ${height - bottom}`,
    `C ${width} ${height - bottom + bottomControl} ${width - right + rightControl} ${height} ${width - right} ${height}`,
    `H ${left}`,
    `C ${left - leftControl} ${height} 0 ${height - bottom + bottomControl} 0 ${height - bottom}`,
    `V ${top}`,
    `C 0 ${top - topControl} ${left - leftControl} 0 ${left} 0`,
    'Z',
  ].join(' ')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">` +
    `<path fill="white" d="${path}"/></svg>`

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function CupertinoPageRoute({
  children,
  className,
  screenCornerRadius,
  style,
  swipeBackEnabled = true,
}: CupertinoPageRouteProps) {
  const route = usePageRouteTransition()
  const reducedMotion = usePrefersReducedMotion()
  const pageRef = useRef<HTMLDivElement>(null)
  const entered = useRouteEnter(pageRef)
  const dragRef = useRef<DragState | null>(null)
  const cornerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousScreenRef = useRef<HTMLElement | null>(null)
  const previousScreenStyleRef = useRef<SavedPreviousScreenStyle | null>(null)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const [isSettling, setIsSettling] = useState(false)
  const [screenSize, setScreenSize] = useState<ScreenSize | null>(null)
  const cornerRadius = useMemo(
    () => ({
      bottom: Math.max(0, screenCornerRadius?.bottom ?? 0),
      left: Math.max(0, screenCornerRadius?.left ?? 0),
      right: Math.max(0, screenCornerRadius?.right ?? 0),
      top: Math.max(0, screenCornerRadius?.top ?? 0),
    }),
    [
      screenCornerRadius?.bottom,
      screenCornerRadius?.left,
      screenCornerRadius?.right,
      screenCornerRadius?.top,
    ],
  )
  const hasCornerRadius =
    cornerRadius.top > 0 ||
    cornerRadius.right > 0 ||
    cornerRadius.bottom > 0 ||
    cornerRadius.left > 0
  const [hasTransitionMask, setHasTransitionMask] = useState(
    hasCornerRadius,
  )

  const clearCornerTimer = useCallback(() => {
    if (cornerTimerRef.current) {
      clearTimeout(cornerTimerRef.current)
      cornerTimerRef.current = null
    }
  }, [])

  const preparePreviousScreen = useCallback(() => {
    if (previousScreenRef.current) {
      return previousScreenRef.current
    }

    const currentScreen = pageRef.current?.parentElement
    const previousScreen = currentScreen?.previousElementSibling
    if (!(previousScreen instanceof HTMLElement)) {
      return null
    }

    previousScreenRef.current = previousScreen
    previousScreenStyleRef.current = {
      transform: previousScreen.style.transform,
      transformOrigin: previousScreen.style.transformOrigin,
      transition: previousScreen.style.transition,
      willChange: previousScreen.style.willChange,
    }
    previousScreen.style.transformOrigin = 'center center'
    previousScreen.style.willChange = 'transform'
    return previousScreen
  }, [])

  const setPreviousScreenProgress = useCallback(
    (progress: number, duration: number) => {
      const previousScreen = preparePreviousScreen()
      const savedStyle = previousScreenStyleRef.current
      if (!previousScreen || !savedStyle) {
        return
      }

      const clampedProgress = Math.min(1, Math.max(0, progress))
      const offset = -PREVIOUS_ROUTE_OFFSET * (1 - clampedProgress)
      previousScreen.style.transform =
        `translate3d(${offset}%, 0, 0)`
      previousScreen.style.transition =
        reducedMotion || duration <= 0
          ? 'none'
          : `transform ${duration}ms ${TRANSITION_EASING}`
    },
    [preparePreviousScreen, reducedMotion],
  )

  const restorePreviousScreen = useCallback(() => {
    const previousScreen = previousScreenRef.current
    const savedStyle = previousScreenStyleRef.current
    if (previousScreen && savedStyle) {
      Object.assign(previousScreen.style, savedStyle)
    }
    previousScreenRef.current = null
    previousScreenStyleRef.current = null
  }, [])

  useLayoutEffect(
    () => route.registerTransition(HERO_TRANSITION_CONFIG),
    [route],
  )

  useLayoutEffect(() => {
    const previousScreen = preparePreviousScreen()
    if (!previousScreen) {
      return
    }

    setPreviousScreenProgress(1, 0)
    previousScreen.getBoundingClientRect()
    setPreviousScreenProgress(0, PUSH_TRANSITION_DURATION)

    return restorePreviousScreen
  }, [
    preparePreviousScreen,
    restorePreviousScreen,
    setPreviousScreenProgress,
  ])

  useLayoutEffect(() => {
    if (route.phase === 'exiting' && !isSettling) {
      clearCornerTimer()
      setHasTransitionMask(hasCornerRadius)
      setPreviousScreenProgress(1, POP_TRANSITION_DURATION)
    }
  }, [
    clearCornerTimer,
    isSettling,
    route.phase,
    hasCornerRadius,
    setPreviousScreenProgress,
  ])

  useEffect(() => {
    if (!entered || route.phase !== 'active') {
      return
    }

    clearCornerTimer()
    if (reducedMotion || !hasCornerRadius) {
      setHasTransitionMask(false)
      return
    }

    cornerTimerRef.current = setTimeout(() => {
      setHasTransitionMask(false)
      cornerTimerRef.current = null
    }, PUSH_TRANSITION_DURATION)

    return clearCornerTimer
  }, [
    clearCornerTimer,
    entered,
    reducedMotion,
    route.phase,
    hasCornerRadius,
  ])

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
      clearCornerTimer()
    },
    [clearCornerTimer],
  )

  useEffect(() => {
    const page = pageRef.current
    if (!page) {
      return
    }

    const blockActiveGestureScroll = (event: TouchEvent) => {
      if (!dragRef.current?.active) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
    }

    page.addEventListener('touchmove', blockActiveGestureScroll, {
      capture: true,
      passive: false,
    })
    return () => {
      page.removeEventListener('touchmove', blockActiveGestureScroll, true)
    }
  }, [])

  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page) {
      return
    }

    const updateScreenSize = () => {
      const bounds = page.getBoundingClientRect()
      const nextSize = {
        height: page.offsetHeight || bounds.height,
        width: page.offsetWidth || bounds.width,
      }
      setScreenSize((current) =>
        current?.height === nextSize.height &&
        current.width === nextSize.width
          ? current
          : nextSize,
      )
    }

    updateScreenSize()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScreenSize)
      return () => window.removeEventListener('resize', updateScreenSize)
    }

    const observer = new ResizeObserver(updateScreenSize)
    observer.observe(page)
    return () => observer.disconnect()
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = pageRef.current?.getBoundingClientRect()
    if (!bounds) {
      return
    }
    if (
      !swipeBackEnabled ||
      !route.canPop ||
      !route.isActive ||
      isInsideHorizontalScrollArea(event.target, pageRef.current) ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return
    }

    const width = bounds.width || window.innerWidth

    dragRef.current = {
      active: false,
      gesture: null,
      lastTime: event.timeStamp,
      lastX: event.clientX,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      velocity: 0,
      width,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.active) {
      if (
        Math.abs(deltaY) >= SWIPE_ACTIVATION_DISTANCE &&
        Math.abs(deltaY) >= Math.max(0, deltaX)
      ) {
        dragRef.current = null
        return
      }
      if (
        deltaX < SWIPE_ACTIVATION_DISTANCE ||
        deltaX <= Math.abs(deltaY)
      ) {
        return
      }
      const gesture = route.beginPopGesture()
      if (!gesture) {
        dragRef.current = null
        return
      }
      drag.active = true
      drag.gesture = gesture
      clearCornerTimer()
      setHasTransitionMask(hasCornerRadius)
      setPreviousScreenProgress(0, 0)
      setIsSettling(false)
      setDragOffset(0)
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    const offset = Math.min(
      drag.width,
      Math.max(0, deltaX),
    )
    const elapsed = Math.max(1, event.timeStamp - drag.lastTime)

    drag.velocity = Math.max(0, (event.clientX - drag.lastX) / elapsed)
    drag.lastX = event.clientX
    drag.lastTime = event.timeStamp
    setDragOffset(offset)
    const progress = offset / drag.width
    setPreviousScreenProgress(progress, 0)
    drag.gesture?.update(progress)
    event.preventDefault()
    event.stopPropagation()
  }

  const settleDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    if (!drag.active) {
      dragRef.current = null
      return
    }

    const offset = Math.max(0, drag.lastX - drag.startX)
    const shouldPop =
      !cancelled &&
      (offset >= drag.width * SWIPE_COMPLETION_RATIO ||
        drag.velocity >= SWIPE_COMPLETION_VELOCITY)

    dragRef.current = null
    setIsSettling(true)
    event.preventDefault()
    event.stopPropagation()

    if (shouldPop) {
      setPreviousScreenProgress(1, INTERACTIVE_TRANSITION_DURATION)
      drag.gesture?.complete(INTERACTIVE_TRANSITION_DURATION)
      setDragOffset(drag.width)
      return
    }

    setPreviousScreenProgress(0, INTERACTIVE_TRANSITION_DURATION)
    drag.gesture?.cancel(INTERACTIVE_TRANSITION_DURATION)
    setDragOffset(0)
    resetTimerRef.current = setTimeout(() => {
      setDragOffset(null)
      setIsSettling(false)
      setHasTransitionMask(false)
    }, INTERACTIVE_TRANSITION_DURATION)
  }

  const phase = route.phase

  const transform =
    dragOffset !== null
      ? `translate3d(${dragOffset}px, 0, 0)`
      : phase === 'exiting'
        ? 'translate3d(100%, 0, 0)'
        : phase === 'covered'
          ? 'translate3d(0, 0, 0)'
          : entered
            ? 'translate3d(0, 0, 0)'
            : 'translate3d(100%, 0, 0)'

  const routeTransitionDuration =
    phase === 'exiting'
      ? POP_TRANSITION_DURATION
      : PUSH_TRANSITION_DURATION
  const transition =
    reducedMotion ||
    (!entered && phase === 'active') ||
    (dragOffset !== null && !isSettling)
      ? 'none'
      : isSettling
        ? `transform ${INTERACTIVE_TRANSITION_DURATION}ms ${TRANSITION_EASING}`
        : `transform ${routeTransitionDuration}ms ${TRANSITION_EASING}`
  const showSwipeGuard =
    swipeBackEnabled && route.canPop && dragOffset !== null
  const cornerMaskActive =
    hasCornerRadius &&
    (hasTransitionMask ||
      route.phase === 'exiting' ||
      dragOffset !== null ||
      isSettling)
  const maskImage = useMemo(
    () =>
      cornerMaskActive && screenSize
        ? createContinuousCornerMask(screenSize, cornerRadius)
        : cornerMaskActive
          ? 'radial-gradient(white, black)'
          : 'none',
    [cornerMaskActive, cornerRadius, screenSize],
  )

  return (
    <>
      <div
        ref={pageRef}
        className={className}
        data-page-route="cupertino"
        data-route-phase={phase}
        data-swipe-active={dragOffset !== null}
        onPointerCancelCapture={(event) => settleDrag(event, true)}
        onPointerDownCapture={handlePointerDown}
        onPointerMoveCapture={handlePointerMove}
        onPointerUpCapture={settleDrag}
        style={{
          ...pageRouteStyle,
          ...style,
          borderRadius: cornerMaskActive
            ? `${cornerRadius.left}px ${cornerRadius.right}px ${cornerRadius.right}px ${cornerRadius.left}px / ${cornerRadius.top}px ${cornerRadius.top}px ${cornerRadius.bottom}px ${cornerRadius.bottom}px`
            : 0,
          boxShadow: '-2px 0 14px rgb(0 0 0 / 18%)',
          maskImage,
          maskRepeat: 'no-repeat',
          maskSize: '100% 100%',
          touchAction: 'pan-y',
          transform,
          transition,
          willChange: phase === 'covered' ? 'auto' : 'transform',
          WebkitMaskImage: maskImage,
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskSize: '100% 100%',
        }}
      >
        {children}
      </div>
      {showSwipeGuard && (
        <InteractionGuard
          aria-hidden="true"
          data-cupertino-swipe-guard=""
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onPointerCancel={(event) => settleDrag(event, true)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={settleDrag}
          style={{
            backgroundColor: 'transparent',
            bottom: 0,
            cursor: dragOffset !== null ? 'grabbing' : 'default',
            left: 0,
            overscrollBehavior: 'none',
            pointerEvents: 'auto',
            position: 'absolute',
            right: 0,
            top: 0,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            width: 'auto',
            zIndex: 1,
          }}
        />
      )}
    </>
  )
}
