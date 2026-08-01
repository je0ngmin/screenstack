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
  PageRouteHeroTransitionConfig,
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
  const heroTransitionConfigsRef = useRef(
    new Map<string, PageRouteHeroTransitionConfig>(),
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

  const registerHeroTransition = useCallback(
    (screenId: string, config: PageRouteHeroTransitionConfig) => {
      heroTransitionConfigsRef.current.set(screenId, config)

      return () => {
        if (heroTransitionConfigsRef.current.get(screenId) === config) {
          heroTransitionConfigsRef.current.delete(screenId)
        }
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
    const timing = heroTransitionConfigsRef.current.get(
      pending.timingScreenId,
    )?.[pending.direction]
    cancelHeroTransitionRef.current = animateHeroes(
      pending.snapshots,
      heroRegistryRef.current.get(pending.targetScreenId),
      timing,
    )
  }, [exitingScreenId, screens])

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
      const flight = createHeroTransition(
        captureHeroes(heroRegistryRef.current.get(screenId)),
        heroRegistryRef.current.get(targetScreenId),
        { interactive: true },
      )
      activePopGestureRef.current = { flight, screenId }
      setPopGestureScreenId(screenId)
      return true
    },
    [cancelHeroTransition, exitingScreenId, screens],
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
    (screenId: string, completed: boolean, duration = 350) => {
      const gesture = activePopGestureRef.current
      if (gesture?.screenId !== screenId) {
        return
      }

      gesture.flight.settleTo(completed ? 1 : 0, duration)
      cancelHeroTransitionRef.current = gesture.flight.cancel
      activePopGestureRef.current = null
      setPopGestureScreenId(null)

      if (completed) {
        clearPopTimer()
        setExitingScreenId(screenId)
        popTimerRef.current = setTimeout(
          () => completePop(screenId),
          duration,
        )
      }
    },
    [clearPopTimer, completePop],
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
        snapshots: captureHeroes(heroRegistryRef.current.get(screenId)),
        targetScreenId,
        timingScreenId: screenId,
      }
      setExitingScreenId(screenId)

      const popDuration =
        heroTransitionConfigsRef.current.get(screenId)?.pop.duration ??
        DEFAULT_TRANSITION_DURATION

      popTimerRef.current = setTimeout(
        () => completePop(screenId),
        Math.max(0, popDuration),
      )
    },
    [cancelHeroTransition, completePop, exitingScreenId, screens],
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
          snapshots: captureHeroes(
            sourceScreenId
              ? heroRegistryRef.current.get(sourceScreenId)
              : undefined,
          ),
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
    [cancelHeroTransition, clearPopTimer, screens, startPop],
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
                canPop: index > 0,
                cancelPopGesture: (duration) =>
                  settlePopGesture(screen.id, false, duration),
                completePopGesture: (duration) =>
                  settlePopGesture(screen.id, true, duration),
                phase,
                popGestureInProgress:
                  popGestureScreenId === screen.id,
                registerHeroTransition: (config) =>
                  registerHeroTransition(screen.id, config),
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
