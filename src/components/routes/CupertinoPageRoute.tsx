import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
const PUSH_TRANSITION_DURATION = 150
const POP_TRANSITION_DURATION = 150
const INTERACTIVE_TRANSITION_DURATION = 100
const TRANSITION_EASING = 'cubic-bezier(.15,.64,.55,.90)'
const TRANSITION_CURVE = createCubicBezierCurve(0.15, 0.64, 0.55, 0.9)
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

export function CupertinoPageRoute({
  children,
  className,
  style,
  swipeBackEnabled = true,
}: CupertinoPageRouteProps) {
  const route = usePageRouteTransition()
  const reducedMotion = usePrefersReducedMotion()
  const pageRef = useRef<HTMLDivElement>(null)
  const entered = useRouteEnter(pageRef)
  const dragRef = useRef<DragState | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousScreenRef = useRef<HTMLElement | null>(null)
  const previousScreenStyleRef = useRef<SavedPreviousScreenStyle | null>(null)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const [isSettling, setIsSettling] = useState(false)

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
      setPreviousScreenProgress(1, POP_TRANSITION_DURATION)
    }
  }, [isSettling, route.phase, setPreviousScreenProgress])

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    },
    [],
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

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = pageRef.current?.getBoundingClientRect()
    if (!bounds) {
      return
    }
    if (
      !swipeBackEnabled ||
      !route.canPop ||
      route.phase !== 'active' ||
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
          boxShadow: '-2px 0 14px rgb(0 0 0 / 18%)',
          touchAction: 'pan-y',
          transform,
          transition,
          willChange: phase === 'covered' ? 'auto' : 'transform',
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
