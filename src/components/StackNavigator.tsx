import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  HeroContext,
  type RegisteredHero,
} from '../context/HeroContext'
import { PageRouteContext } from '../context/PageRouteContext'
import { StackNavigationContext } from '../context/StackNavigationContext'
import type {
  PageRoutePopGesture,
  PageRouteTransitionConfig,
  StackNavigation,
  StackNavigationState,
  StackNavigatorProps,
} from '../types/navigation'
import { createScreen } from '../utils/createScreen'
import {
  animateHeroes,
  captureHeroes,
  createHeroTransition,
  type HeroSnapshot,
  type HeroTransitionController,
} from '../utils/heroTransition'
import { navigatorStyle, screenStyle } from '../utils/routeStyles'
import { InteractionGuard } from './InteractionGuard'

const DEFAULT_TRANSITION_DURATION = 500

interface PendingHeroTransition {
  direction: 'pop' | 'push'
  snapshots: ReadonlyMap<string, HeroSnapshot>
  targetScreenId: string
  timingScreenId: string
}

interface ActivePopGesture {
  flight: HeroTransitionController
  screenId: string
}

export const StackNavigator = forwardRef<
  StackNavigation,
  StackNavigatorProps
>(function StackNavigator(
  { children, className, initialScreen },
  ref,
) {
  const [screens, setScreens] = useState(() => [
    createScreen(initialScreen ?? children, 'root'),
  ])
  const [exitingScreenId, setExitingScreenId] = useState<string | null>(null)
  const [popGestureScreenId, setPopGestureScreenId] = useState<string | null>(
    null,
  )
  const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heroRegistryRef = useRef(
    new Map<string, Map<string, RegisteredHero>>(),
  )
  const transitionConfigsRef = useRef(
    new Map<string, PageRouteTransitionConfig>(),
  )
  const pendingHeroTransitionRef = useRef<PendingHeroTransition | null>(null)
  const cancelHeroTransitionRef = useRef<(() => void) | null>(null)
  const activePopGestureRef = useRef<ActivePopGesture | null>(null)

  const registerHero = useCallback(
    (screenId: string, id: string, hero: RegisteredHero) => {
      let screenHeroes = heroRegistryRef.current.get(screenId)
      if (!screenHeroes) {
        screenHeroes = new Map()
        heroRegistryRef.current.set(screenId, screenHeroes)
      }
      screenHeroes.set(id, hero)

      return () => {
        const registeredHeroes = heroRegistryRef.current.get(screenId)
        if (registeredHeroes?.get(id) === hero) {
          registeredHeroes.delete(id)
          if (registeredHeroes.size === 0) {
            heroRegistryRef.current.delete(screenId)
          }
        }
      }
    },
    [],
  )

  const cancelHeroTransition = useCallback(() => {
    cancelHeroTransitionRef.current?.()
    cancelHeroTransitionRef.current = null
    activePopGestureRef.current?.flight.cancel()
    activePopGestureRef.current = null
    pendingHeroTransitionRef.current = null
    setPopGestureScreenId(null)
  }, [])

  const registerTransition = useCallback(
    (screenId: string, config: PageRouteTransitionConfig) => {
      transitionConfigsRef.current.set(screenId, config)

      return () => {
        if (transitionConfigsRef.current.get(screenId) === config) {
          transitionConfigsRef.current.delete(screenId)
        }
      }
    },
    [],
  )

  const withHeroMeasurement = useCallback(
    <Result,>(screenId: string, measure: () => Result) => {
      const restore = transitionConfigsRef.current
        .get(screenId)
        ?.prepareHeroMeasurement?.()

      try {
        return measure()
      } finally {
        restore?.()
      }
    },
    [],
  )

  const clearPopTimer = useCallback(() => {
    if (popTimerRef.current) {
      clearTimeout(popTimerRef.current)
      popTimerRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      clearPopTimer()
      cancelHeroTransition()
    },
    [cancelHeroTransition, clearPopTimer],
  )

  useLayoutEffect(() => {
    const pending = pendingHeroTransitionRef.current
    if (!pending || !screens.some(({ id }) => id === pending.targetScreenId)) {
      return
    }

    pendingHeroTransitionRef.current = null
    const timing = transitionConfigsRef.current.get(
      pending.timingScreenId,
    )?.[pending.direction]
    cancelHeroTransitionRef.current = withHeroMeasurement(
      pending.targetScreenId,
      () =>
        animateHeroes(
          pending.snapshots,
          heroRegistryRef.current.get(pending.targetScreenId),
          timing,
        ),
    )
  }, [exitingScreenId, screens, withHeroMeasurement])

  const completePop = useCallback(
    (screenId: string) => {
      clearPopTimer()
      if (activePopGestureRef.current?.screenId === screenId) {
        activePopGestureRef.current = null
      }
      setPopGestureScreenId((current) =>
        current === screenId ? null : current,
      )
      setScreens((current) => current.filter(({ id }) => id !== screenId))
      setExitingScreenId(null)
    },
    [clearPopTimer],
  )

  const startPopGesture = useCallback(
    (screenId: string) => {
      const activeScreenId = screens[screens.length - 1]?.id
      const targetScreenId = screens[screens.length - 2]?.id
      if (
        screens.length <= 1 ||
        exitingScreenId ||
        activePopGestureRef.current ||
        screenId !== activeScreenId ||
        !targetScreenId
      ) {
        return false
      }

      cancelHeroTransition()
      const snapshots = withHeroMeasurement(screenId, () =>
        captureHeroes(heroRegistryRef.current.get(screenId)),
      )
      const flight = withHeroMeasurement(targetScreenId, () =>
        createHeroTransition(
          snapshots,
          heroRegistryRef.current.get(targetScreenId),
          { interactive: true },
        ),
      )
      activePopGestureRef.current = { flight, screenId }
      setPopGestureScreenId(screenId)
      return true
    },
    [cancelHeroTransition, exitingScreenId, screens, withHeroMeasurement],
  )

  const updatePopGesture = useCallback(
    (screenId: string, progress: number) => {
      const gesture = activePopGestureRef.current
      if (gesture?.screenId === screenId) {
        gesture.flight.setProgress(progress)
      }
    },
    [],
  )

  const settlePopGesture = useCallback(
    (screenId: string, completed: boolean, duration?: number) => {
      const gesture = activePopGestureRef.current
      if (gesture?.screenId !== screenId) {
        return
      }

      const settleDuration =
        duration ??
        transitionConfigsRef.current.get(screenId)?.pop.duration ??
        DEFAULT_TRANSITION_DURATION

      const curve = transitionConfigsRef.current.get(screenId)?.pop.curve
      gesture.flight.settleTo(completed ? 1 : 0, settleDuration, curve)
      cancelHeroTransitionRef.current = gesture.flight.cancel
      activePopGestureRef.current = null
      setPopGestureScreenId(null)

      if (completed) {
        clearPopTimer()
        setExitingScreenId(screenId)
        popTimerRef.current = setTimeout(
          () => completePop(screenId),
          settleDuration,
        )
      }
    },
    [clearPopTimer, completePop],
  )

  const beginPopGesture = useCallback(
    (screenId: string): PageRoutePopGesture | null => {
      if (!startPopGesture(screenId)) {
        return null
      }

      let settled = false
      return {
        cancel: (duration) => {
          if (settled) {
            return
          }
          settled = true
          settlePopGesture(screenId, false, duration)
        },
        complete: (duration) => {
          if (settled) {
            return
          }
          settled = true
          settlePopGesture(screenId, true, duration)
        },
        update: (progress) => {
          if (!settled) {
            updatePopGesture(screenId, progress)
          }
        },
      }
    },
    [settlePopGesture, startPopGesture, updatePopGesture],
  )

  const startPop = useCallback(
    () => {
      if (screens.length <= 1 || exitingScreenId) {
        return
      }

      const screenId = screens[screens.length - 1]?.id
      const targetScreenId = screens[screens.length - 2]?.id
      if (!screenId || !targetScreenId) {
        return
      }

      cancelHeroTransition()
      pendingHeroTransitionRef.current = {
        direction: 'pop',
        snapshots: withHeroMeasurement(screenId, () =>
          captureHeroes(heroRegistryRef.current.get(screenId)),
        ),
        targetScreenId,
        timingScreenId: screenId,
      }
      setExitingScreenId(screenId)

      const popDuration =
        transitionConfigsRef.current.get(screenId)?.pop.duration ??
        DEFAULT_TRANSITION_DURATION

      popTimerRef.current = setTimeout(
        () => completePop(screenId),
        Math.max(0, popDuration),
      )
    },
    [
      cancelHeroTransition,
      completePop,
      exitingScreenId,
      screens,
      withHeroMeasurement,
    ],
  )

  const navigation = useMemo<StackNavigation>(
    () => ({
      canGoBack: screens.length > 1,
      push: (element, id) => {
        cancelHeroTransition()
        clearPopTimer()
        setExitingScreenId(null)
        const nextScreen = createScreen(element, id)
        const sourceScreenId = screens[screens.length - 1]?.id
        pendingHeroTransitionRef.current = {
          direction: 'push',
          snapshots: sourceScreenId
            ? withHeroMeasurement(sourceScreenId, () =>
                captureHeroes(
                  heroRegistryRef.current.get(sourceScreenId),
                ),
              )
            : new Map(),
          targetScreenId: nextScreen.id,
          timingScreenId: nextScreen.id,
        }
        setScreens((current) => [...current, nextScreen])
      },
      pop: () => {
        startPop()
      },
      replace: (element, id) => {
        cancelHeroTransition()
        clearPopTimer()
        setExitingScreenId(null)
        setScreens((current) => [
          ...current.slice(0, -1),
          createScreen(element, id),
        ])
      },
      reset: (element, id) => {
        cancelHeroTransition()
        clearPopTimer()
        setExitingScreenId(null)
        setScreens([createScreen(element, id)])
      },
    }),
    [
      cancelHeroTransition,
      clearPopTimer,
      screens,
      startPop,
      withHeroMeasurement,
    ],
  )

  useImperativeHandle(ref, () => navigation, [navigation])

  const activeIndex = exitingScreenId
    ? Math.max(0, screens.length - 2)
    : screens.length - 1
  const activeScreen = screens[activeIndex]
  const navigatorContextValue = useMemo<StackNavigationState>(
    () => ({ ...navigation, isActive: true }),
    [navigation],
  )

  return (
    <StackNavigationContext.Provider value={navigatorContextValue}>
      <div
        className={className}
        data-screen-id={activeScreen?.id}
        style={navigatorStyle}
      >
        {screens.map((screen, index) => {
          const phase =
            screen.id === exitingScreenId
              ? 'exiting'
              : index === activeIndex
                ? 'active'
                : 'covered'
          const blocksPreviousRoute = index < screens.length - 1
          const screenNavigation: StackNavigationState = {
            ...navigation,
            canGoBack: index > 0,
            isActive: phase === 'active',
          }

          return (
            <PageRouteContext.Provider
              key={screen.id}
              value={{
                beginPopGesture: () => beginPopGesture(screen.id),
                canPop: index > 0,
                cancelPopGesture: (duration) =>
                  settlePopGesture(screen.id, false, duration),
                completePopGesture: (duration) =>
                  settlePopGesture(screen.id, true, duration),
                phase,
                popGestureInProgress:
                  popGestureScreenId === screen.id,
                registerHeroTransition: (config) =>
                  registerTransition(screen.id, config),
                registerTransition: (config) =>
                  registerTransition(screen.id, config),
                startPopGesture: () => startPopGesture(screen.id),
                updatePopGesture: (progress) =>
                  updatePopGesture(screen.id, progress),
              }}
            >
              <StackNavigationContext.Provider value={screenNavigation}>
                <HeroContext.Provider
                  value={{
                    registerHero: (id, hero) =>
                      registerHero(screen.id, id, hero),
                  }}
                >
                  <div
                    aria-hidden={phase === 'covered'}
                    data-route-phase={phase}
                    data-screen-id={screen.id}
                    style={{
                      ...screenStyle,
                      pointerEvents: phase === 'active' ? 'auto' : 'none',
                    }}
                  >
                    {screen.element}
                    {blocksPreviousRoute && (
                      <InteractionGuard
                        aria-hidden="true"
                        data-route-interaction-guard=""
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                        onPointerDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          bottom: 0,
                          left: 0,
                          overscrollBehavior: 'none',
                          pointerEvents: 'auto',
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          touchAction: 'none',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                      />
                    )}
                  </div>
                </HeroContext.Provider>
              </StackNavigationContext.Provider>
            </PageRouteContext.Provider>
          )
        })}
      </div>
    </StackNavigationContext.Provider>
  )
})
