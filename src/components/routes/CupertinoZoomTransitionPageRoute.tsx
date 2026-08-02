import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { usePageRouteTransition } from '../../hooks/usePageRouteTransition'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import type { CupertinoZoomTransitionPageRouteProps } from '../../types/navigation'
import { pageRouteStyle } from '../../utils/routeStyles'
import { isInsideHorizontalScrollArea } from '../../utils/swipeGesture'
import {
  createSourceZoomTransition,
  type SourceZoomTransitionController,
} from '../../utils/sourceZoomTransition'
import { InteractionGuard } from '../InteractionGuard'

const DEFAULT_TRANSITION_DURATION = 400
const INTERACTIVE_SETTLE_DURATION = 420
const TRANSITION_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
const SWIPE_COMPLETION_RATIO = 0.33
const SWIPE_COMPLETION_VELOCITY = 0.5
const PREVIOUS_ROUTE_SCALE = 0.9
const OPACITY_HANDOFF_PROGRESS = 0.65
const SWIPE_ACTIVATION_DISTANCE = 20

interface SourceGeometry {
  borderRadius: string
  contentScale: number
  contentTranslateX: number
  contentTranslateY: number
  pageHeight: number
  pageWidth: number
  leftInset: number
  sourceHeight: number
  sourceWidth: number
  topInset: number
}

interface DragState {
  active: boolean
  lastTime: number
  lastX: number
  pointerId: number
  startX: number
  startY: number
  velocity: number
  width: number
}

interface DragOffset {
  x: number
  y: number
}

type SettleTarget = 'source' | 'rest' | null

interface SavedPreviousScreenStyle {
  transform: string
  transformOrigin: string
  transition: string
  willChange: string
}

interface SavedPreviousRouteStyle {
  element: HTMLElement
  transition: string
  willChange: string
}

function readSourceGeometry(
  page: HTMLElement | null,
  source: HTMLElement | null,
): SourceGeometry | null {
  if (!page || !source) {
    return null
  }

  const pageBounds = page.getBoundingClientRect()
  const sourceBounds = source.getBoundingClientRect()
  if (
    pageBounds.width <= 0 ||
    pageBounds.height <= 0 ||
    sourceBounds.width <= 0 ||
    sourceBounds.height <= 0
  ) {
    return null
  }

  return {
    borderRadius: getComputedStyle(source).borderRadius || '0px',
    contentScale: sourceBounds.width / pageBounds.width,
    contentTranslateX:
      sourceBounds.left + sourceBounds.width / 2 -
      (pageBounds.left + pageBounds.width / 2),
    contentTranslateY:
      sourceBounds.top + sourceBounds.height / 2 -
      (pageBounds.top + pageBounds.height / 2),
    leftInset: sourceBounds.left - pageBounds.left,
    pageHeight: pageBounds.height,
    pageWidth: pageBounds.width,
    sourceHeight: sourceBounds.height,
    sourceWidth: sourceBounds.width,
    topInset: sourceBounds.top - pageBounds.top,
  }
}

function contentTransform(geometry: SourceGeometry | null) {
  if (!geometry) {
    return 'translate3d(0, 24px, 0) scale(0.92, 0.92)'
  }

  return `translate3d(${geometry.contentTranslateX}px, ${geometry.contentTranslateY}px, 0) scale(${geometry.contentScale}, ${geometry.contentScale})`
}

export function CupertinoZoomTransitionPageRoute({
  children,
  className,
  sourceRef,
  style,
  swipeBackEnabled = true,
  transitionDuration = DEFAULT_TRANSITION_DURATION,
}: CupertinoZoomTransitionPageRouteProps) {
  const route = usePageRouteTransition()
  const reducedMotion = usePrefersReducedMotion()
  const pageRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const enterFramesRef = useRef<[number, number] | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pushSourceFlightRef = useRef<SourceZoomTransitionController | null>(
    null,
  )
  const popSourceFlightRef = useRef<SourceZoomTransitionController | null>(
    null,
  )
  const gestureSourceFlightRef =
    useRef<SourceZoomTransitionController | null>(null)
  const gestureSourceVisibilityRef = useRef<string | null>(null)
  const previousScreenRef = useRef<HTMLElement | null>(null)
  const previousScreenStyleRef = useRef<SavedPreviousScreenStyle | null>(
    null,
  )
  const previousRouteStyleRef = useRef<SavedPreviousRouteStyle | null>(null)
  const [entered, setEntered] = useState(false)
  const [geometry, setGeometry] = useState<SourceGeometry | null>(null)
  const [geometryReady, setGeometryReady] = useState(false)
  const [dragOffset, setDragOffset] = useState<DragOffset | null>(null)
  const [settleTarget, setSettleTarget] = useState<SettleTarget>(null)

  const measureSource = useCallback(() => {
    const nextGeometry = readSourceGeometry(
      pageRef.current,
      sourceRef.current,
    )
    setGeometry(nextGeometry)
    setGeometryReady(true)
    return nextGeometry
  }, [sourceRef])

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
    const previousRoute = Array.from(previousScreen.children).find(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        element.dataset.pageRoute === 'cupertino',
    )
    if (previousRoute) {
      previousRouteStyleRef.current = {
        element: previousRoute,
        transition: previousRoute.style.transition,
        willChange: previousRoute.style.willChange,
      }
      previousRoute.style.transform = 'translate3d(0, 0, 0)'
      previousRoute.style.transition = 'none'
      previousRoute.style.willChange = 'auto'
      previousRoute.getBoundingClientRect()
    }
    return previousScreen
  }, [])

  const setPreviousScreenScale = useCallback(
    (scale: number, duration: number) => {
      const previousScreen = preparePreviousScreen()
      const savedStyle = previousScreenStyleRef.current
      if (!previousScreen || !savedStyle) {
        return
      }

      previousScreen.style.transform = `scale(${scale}, ${scale})`
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
    const previousRouteStyle = previousRouteStyleRef.current
    if (previousRouteStyle?.element.isConnected) {
      previousRouteStyle.element.style.transform =
        'translate3d(0, 0, 0)'
      previousRouteStyle.element.style.transition =
        previousRouteStyle.transition
      previousRouteStyle.element.style.willChange =
        previousRouteStyle.willChange
    }
    previousScreenRef.current = null
    previousScreenStyleRef.current = null
    previousRouteStyleRef.current = null
  }, [])

  const hideGestureSource = useCallback(() => {
    const source = sourceRef.current
    if (!source || gestureSourceVisibilityRef.current !== null) {
      return
    }
    gestureSourceVisibilityRef.current = source.style.visibility
    source.style.visibility = 'hidden'
  }, [sourceRef])

  const restoreGestureSource = useCallback(() => {
    const source = sourceRef.current
    const visibility = gestureSourceVisibilityRef.current
    if (source && visibility !== null) {
      source.style.visibility = visibility
    }
    gestureSourceVisibilityRef.current = null
  }, [sourceRef])

  useLayoutEffect(() => {
    preparePreviousScreen()
    setPreviousScreenScale(1, 0)
    measureSource()
    pageRef.current?.getBoundingClientRect()
    pushSourceFlightRef.current = createSourceZoomTransition(
      sourceRef.current,
      pageRef.current,
      {
        direction: 'push',
        duration: transitionDuration,
      },
    )

    if (reducedMotion || typeof requestAnimationFrame === 'undefined') {
      setEntered(true)
      return () => pushSourceFlightRef.current?.cancel()
    }

    let enterFrame = 0
    const initialFrame = requestAnimationFrame(() => {
      maskRef.current?.getBoundingClientRect()
      setPreviousScreenScale(PREVIOUS_ROUTE_SCALE, transitionDuration)
      enterFrame = requestAnimationFrame(() => setEntered(true))
      enterFramesRef.current = [initialFrame, enterFrame]
    })
    enterFramesRef.current = [initialFrame, enterFrame]

    return () => {
      cancelAnimationFrame(initialFrame)
      if (enterFrame) {
        cancelAnimationFrame(enterFrame)
      }
      pushSourceFlightRef.current?.cancel()
    }
  }, [
    measureSource,
    preparePreviousScreen,
    reducedMotion,
    setPreviousScreenScale,
    sourceRef,
    transitionDuration,
  ])

  useLayoutEffect(() => {
    if (route.phase === 'exiting') {
      setPreviousScreenScale(1, 0)
      measureSource()
      if (!gestureSourceFlightRef.current) {
        pushSourceFlightRef.current?.cancel()
        popSourceFlightRef.current = createSourceZoomTransition(
          sourceRef.current,
          pageRef.current,
          {
            direction: 'pop',
            duration: transitionDuration,
          },
        )
      }
      setPreviousScreenScale(PREVIOUS_ROUTE_SCALE, 0)
      previousScreenRef.current?.getBoundingClientRect()
      setPreviousScreenScale(1, transitionDuration)
    }
  }, [
    measureSource,
    route.phase,
    setPreviousScreenScale,
    sourceRef,
    transitionDuration,
  ])

  useLayoutEffect(
    () =>
      route.registerHeroTransition({
        pop: {
          duration: transitionDuration,
          easing: TRANSITION_EASING,
        },
        push: {
          duration: transitionDuration,
          easing: TRANSITION_EASING,
        },
      }),
    [route, transitionDuration],
  )

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
      pushSourceFlightRef.current?.cancel()
      popSourceFlightRef.current?.cancel()
      gestureSourceFlightRef.current?.cancel()
      restoreGestureSource()
      restorePreviousScreen()
      const frames = enterFramesRef.current
      if (frames) {
        cancelAnimationFrame(frames[0])
        if (frames[1]) {
          cancelAnimationFrame(frames[1])
        }
      }
    },
    [restoreGestureSource, restorePreviousScreen],
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
      if (!route.startPopGesture()) {
        dragRef.current = null
        return
      }
      drag.active = true
      setPreviousScreenScale(1, 0)
      measureSource()
      pushSourceFlightRef.current?.cancel()
      hideGestureSource()
      setPreviousScreenScale(PREVIOUS_ROUTE_SCALE, 0)
      setSettleTarget(null)
      setDragOffset({ x: 0, y: 0 })
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    const progress = Math.min(
      1,
      Math.max(0, deltaX / drag.width),
    )
    const elapsed = Math.max(1, event.timeStamp - drag.lastTime)
    drag.velocity = Math.max(0, (event.clientX - drag.lastX) / elapsed)
    drag.lastX = event.clientX
    drag.lastTime = event.timeStamp

    setDragOffset({
      x: progress * drag.width,
      y: deltaY,
    })
    setPreviousScreenScale(
      PREVIOUS_ROUTE_SCALE + (1 - PREVIOUS_ROUTE_SCALE) * progress,
      0,
    )
    route.updatePopGesture(progress)
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

    const progress = Math.min(
      1,
      Math.max(0, (drag.lastX - drag.startX) / drag.width),
    )
    const shouldPop =
      !cancelled &&
      (progress >= SWIPE_COMPLETION_RATIO ||
        drag.velocity >= SWIPE_COMPLETION_VELOCITY)

    dragRef.current = null
    event.preventDefault()
    event.stopPropagation()

    if (shouldPop) {
      setSettleTarget('source')
      setPreviousScreenScale(1, INTERACTIVE_SETTLE_DURATION)
      restoreGestureSource()
      const pageBounds = pageRef.current?.getBoundingClientRect()
      const sourceBounds =
        pageBounds && geometry
          ? {
              height: geometry.sourceHeight,
              left: pageBounds.left + geometry.leftInset,
              top: pageBounds.top + geometry.topInset,
              width: geometry.sourceWidth,
            }
          : undefined
      gestureSourceFlightRef.current = createSourceZoomTransition(
        sourceRef.current,
        maskRef.current,
        {
          direction: 'pop',
          duration: INTERACTIVE_SETTLE_DURATION,
          sourceBounds,
        },
      )
      route.completePopGesture(INTERACTIVE_SETTLE_DURATION)
      return
    }

    setSettleTarget('rest')
    setPreviousScreenScale(
      PREVIOUS_ROUTE_SCALE,
      INTERACTIVE_SETTLE_DURATION,
    )
    route.cancelPopGesture(INTERACTIVE_SETTLE_DURATION)
    gestureSourceFlightRef.current?.settleTo(
      0,
      INTERACTIVE_SETTLE_DURATION,
    )
    resetTimerRef.current = setTimeout(() => {
      setDragOffset(null)
      setSettleTarget(null)
      gestureSourceFlightRef.current = null
      restoreGestureSource()
      resetTimerRef.current = null
    }, INTERACTIVE_SETTLE_DURATION)
  }

  const atSource =
    !entered || settleTarget === 'source' || route.phase === 'exiting'
  const restingBorderRadius =
    typeof style?.borderRadius === 'number'
      ? `${style.borderRadius}px`
      : style?.borderRadius ?? '0px'
  const routeBorderRadius = atSource
    ? geometry?.borderRadius ?? '20px'
    : restingBorderRadius
  const maskLeft = atSource ? geometry?.leftInset ?? '4%' : 0
  const maskTop = atSource ? geometry?.topInset ?? '4%' : 0
  const maskWidth = atSource
    ? geometry?.sourceWidth ?? '92%'
    : geometry?.pageWidth ?? '100%'
  const maskHeight = atSource
    ? geometry?.sourceHeight ?? '92%'
    : geometry?.pageHeight ?? '100%'
  const interactiveProgress =
    dragOffset === null
      ? 0
      : Math.min(1, dragOffset.x / (geometry?.pageWidth ?? 1))
  const interactiveScale = 1 - interactiveProgress * 0.5
  const routeTransform =
    dragOffset !== null && settleTarget === null
      ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(${interactiveScale}, ${interactiveScale})`
      : 'translate3d(0, 0, 0) scale(1, 1)'
  const routeContentTransform = atSource
    ? contentTransform(geometry)
    : 'translate3d(0, 0, 0) scale(1, 1)'
  const activeDuration = settleTarget
    ? INTERACTIVE_SETTLE_DURATION
    : transitionDuration
  const preparingPush =
    !entered && route.phase === 'active' && settleTarget === null
  const opacityDuration = atSource
    ? activeDuration * (1 - OPACITY_HANDOFF_PROGRESS)
    : activeDuration * OPACITY_HANDOFF_PROGRESS
  const opacityDelay = atSource
    ? activeDuration * OPACITY_HANDOFF_PROGRESS
    : 0
  const maskTransition =
    reducedMotion ||
    preparingPush ||
    (dragOffset !== null && settleTarget === null)
      ? 'none'
      : `border-radius ${activeDuration}ms ${TRANSITION_EASING}, height ${activeDuration}ms ${TRANSITION_EASING}, left ${activeDuration}ms ${TRANSITION_EASING}, opacity ${opacityDuration}ms ${TRANSITION_EASING} ${opacityDelay}ms, top ${activeDuration}ms ${TRANSITION_EASING}, transform ${activeDuration}ms ${TRANSITION_EASING}, width ${activeDuration}ms ${TRANSITION_EASING}`
  const contentTransition =
    reducedMotion ||
    preparingPush ||
    (dragOffset !== null && settleTarget === null)
      ? 'none'
      : `transform ${activeDuration}ms ${TRANSITION_EASING}`
  const showSwipeGuard =
    swipeBackEnabled && route.canPop && dragOffset !== null

  return (
    <>
      <div
        ref={pageRef}
        data-page-route="cupertino-zoom"
        data-route-phase={route.phase}
        data-swipe-active={dragOffset !== null}
        onPointerCancelCapture={(event) => settleDrag(event, true)}
        onPointerDownCapture={handlePointerDown}
        onPointerMoveCapture={handlePointerMove}
        onPointerUpCapture={settleDrag}
        style={{
          ...pageRouteStyle,
          background: 'transparent',
          overflow: 'visible',
          touchAction: 'pan-y',
          visibility: geometryReady ? 'visible' : 'hidden',
          willChange: 'auto',
        }}
      >
        <div
          ref={maskRef}
          className={className}
          data-cupertino-zoom-route-mask=""
          style={{
            ...pageRouteStyle,
            ...style,
            borderRadius: routeBorderRadius,
            bottom: 'auto',
            contain: 'paint',
            height: maskHeight,
            left: maskLeft,
            maxHeight: 'none',
            maxWidth: 'none',
            minHeight: 0,
            minWidth: 0,
            opacity: geometryReady ? (atSource ? 0 : 1) : 0,
            overflow: 'hidden',
            position: 'absolute',
            right: 'auto',
            top: maskTop,
            transform: routeTransform,
            transformOrigin: 'center center',
            transition: maskTransition,
            width: maskWidth,
            willChange:
              route.phase === 'covered' && entered
                ? 'auto'
                : 'border-radius, height, left, opacity, top, transform, width',
          }}
        >
          <div
            data-cupertino-zoom-route-content=""
            style={{
              height: geometry?.pageHeight ?? '100%',
              left: 0,
              overflow: 'auto',
              position: 'absolute',
              top: 0,
              touchAction: 'pan-y',
              transform: routeContentTransform,
              transformOrigin: 'center center',
              transition: contentTransition,
              width: geometry?.pageWidth ?? '100%',
              willChange: atSource ? 'transform' : 'auto',
            }}
          >
            {children}
          </div>
        </div>
      </div>
      {showSwipeGuard && (
        <InteractionGuard
          aria-hidden="true"
          data-cupertino-zoom-swipe-guard=""
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
