import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { usePageRouteTransition } from '../../hooks/usePageRouteTransition'
import { useRouteEnter } from '../../hooks/useRouteEnter'
import type { CupertinoPageRouteProps } from '../../types/navigation'
import { pageRouteStyle } from '../../utils/routeStyles'
import { InteractionGuard } from '../InteractionGuard'

const SWIPE_COMPLETION_RATIO = 0.33
const SWIPE_COMPLETION_VELOCITY = 0.5
const PUSH_TRANSITION_DURATION = 150
const POP_TRANSITION_DURATION = 150
const INTERACTIVE_TRANSITION_DURATION = 100
const TRANSITION_EASING = 'cubic-bezier(.15,.64,.55,.90)'
const HERO_TRANSITION_CONFIG = {
  pop: {
    duration: POP_TRANSITION_DURATION,
    easing: TRANSITION_EASING,
  },
  push: {
    duration: PUSH_TRANSITION_DURATION,
    easing: TRANSITION_EASING,
  },
}

interface DragState {
  lastTime: number
  lastX: number
  pointerId: number
  startX: number
  velocity: number
  width: number
}

export function CupertinoPageRoute({
  children,
  className,
  edgeWidth = 24,
  style,
  swipeBackEnabled = true,
}: CupertinoPageRouteProps) {
  const route = usePageRouteTransition()
  const reducedMotion = usePrefersReducedMotion()
  const pageRef = useRef<HTMLDivElement>(null)
  const entered = useRouteEnter(pageRef)
  const dragRef = useRef<DragState | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const coveredResetTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const [isSettling, setIsSettling] = useState(false)
  const [coveredTransitionComplete, setCoveredTransitionComplete] =
    useState(false)

  useLayoutEffect(
    () => route.registerHeroTransition(HERO_TRANSITION_CONFIG),
    [route],
  )

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
      if (coveredResetTimerRef.current) {
        clearTimeout(coveredResetTimerRef.current)
      }
    },
    [],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = pageRef.current?.getBoundingClientRect()
    if (!bounds) {
      return
    }
    const localX = event.clientX - bounds.left

    if (
      !swipeBackEnabled ||
      !route.canPop ||
      route.phase !== 'active' ||
      localX < 0 ||
      localX > edgeWidth ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return
    }

    if (!route.startPopGesture()) {
      return
    }

    const width = bounds.width || window.innerWidth

    dragRef.current = {
      lastTime: event.timeStamp,
      lastX: event.clientX,
      pointerId: event.pointerId,
      startX: event.clientX,
      velocity: 0,
      width,
    }
    setIsSettling(false)
    setDragOffset(0)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const offset = Math.min(
      drag.width,
      Math.max(0, event.clientX - drag.startX),
    )
    const elapsed = Math.max(1, event.timeStamp - drag.lastTime)

    drag.velocity = Math.max(0, (event.clientX - drag.lastX) / elapsed)
    drag.lastX = event.clientX
    drag.lastTime = event.timeStamp
    setDragOffset(offset)
    route.updatePopGesture(offset / drag.width)
    event.preventDefault()
  }

  const settleDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const offset = Math.max(0, drag.lastX - drag.startX)
    const shouldPop =
      !cancelled &&
      (offset >= drag.width * SWIPE_COMPLETION_RATIO ||
        drag.velocity >= SWIPE_COMPLETION_VELOCITY)

    dragRef.current = null
    setIsSettling(true)

    if (shouldPop) {
      route.completePopGesture(INTERACTIVE_TRANSITION_DURATION)
      setDragOffset(drag.width)
      return
    }

    route.cancelPopGesture(INTERACTIVE_TRANSITION_DURATION)
    setDragOffset(0)
    resetTimerRef.current = setTimeout(() => {
      setDragOffset(null)
      setIsSettling(false)
    }, INTERACTIVE_TRANSITION_DURATION)
  }

  const phase = route.phase

  useEffect(() => {
    if (coveredResetTimerRef.current) {
      clearTimeout(coveredResetTimerRef.current)
      coveredResetTimerRef.current = null
    }

    if (phase !== 'covered') {
      setCoveredTransitionComplete(false)
      return
    }

    if (reducedMotion) {
      setCoveredTransitionComplete(true)
      return
    }

    setCoveredTransitionComplete(false)
    coveredResetTimerRef.current = setTimeout(() => {
      setCoveredTransitionComplete(true)
      coveredResetTimerRef.current = null
    }, PUSH_TRANSITION_DURATION)
  }, [phase, reducedMotion])

  const handleTransitionEnd = (
    event: ReactTransitionEvent<HTMLDivElement>,
  ) => {
    if (
      event.target !== event.currentTarget ||
      event.propertyName !== 'transform' ||
      phase !== 'covered'
    ) {
      return
    }

    if (coveredResetTimerRef.current) {
      clearTimeout(coveredResetTimerRef.current)
      coveredResetTimerRef.current = null
    }
    setCoveredTransitionComplete(true)
  }

  const transform =
    dragOffset !== null
      ? `translate3d(${dragOffset}px, 0, 0)`
      : phase === 'exiting'
        ? 'translate3d(100%, 0, 0)'
        : phase === 'covered'
          ? coveredTransitionComplete
            ? 'translate3d(0, 0, 0)'
            : 'translate3d(-24%, 0, 0)'
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
    (phase === 'covered' && coveredTransitionComplete) ||
    (dragOffset !== null && !isSettling)
      ? 'none'
      : isSettling
        ? `transform ${INTERACTIVE_TRANSITION_DURATION}ms ${TRANSITION_EASING}`
        : `transform ${routeTransitionDuration}ms ${TRANSITION_EASING}`
  const showSwipeGuard =
    swipeBackEnabled &&
    route.canPop &&
    (phase === 'active' || dragOffset !== null)

  return (
    <>
      <div
        ref={pageRef}
        className={className}
        data-page-route="cupertino"
        data-route-phase={phase}
        data-swipe-active={dragOffset !== null}
        onTransitionEnd={handleTransitionEnd}
        style={{
          ...pageRouteStyle,
          ...style,
          boxShadow: '-2px 0 14px rgb(0 0 0 / 18%)',
          touchAction: 'pan-y',
          transform,
          transition,
          willChange:
            phase === 'covered' && coveredTransitionComplete
              ? 'auto'
              : 'transform',
        }}
      >
        {children}
      </div>
      {showSwipeGuard && (
        <InteractionGuard
          aria-hidden="true"
          data-cupertino-swipe-guard=""
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
            right: dragOffset !== null ? 0 : 'auto',
            top: 0,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            width: dragOffset !== null ? 'auto' : edgeWidth,
            zIndex: 1,
          }}
        />
      )}
    </>
  )
}
