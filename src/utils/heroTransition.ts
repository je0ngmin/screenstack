import type {
  HeroElement,
  RegisteredHero,
} from '../context/HeroContext'
import type { PageRouteTransitionCurve } from '../types/navigation'

const HERO_TRANSITION_DURATION = 350
const HERO_TRANSITION_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

export interface HeroSnapshot {
  clone: HeroElement
  element: HeroElement
  rect: DOMRect
  style: HeroVisualStyle
  transitionOnUserGestures: boolean
}

export interface HeroTransitionController {
  cancel: () => void
  setProgress: (progress: number) => void
  settleTo: (
    progress: 0 | 1,
    duration?: number,
    curve?: PageRouteTransitionCurve,
  ) => void
}

interface HeroTransitionOptions {
  duration?: number
  easing?: string
  interactive?: boolean
}

interface InlineMotionStyle {
  animation: string
  transform: string
  transition: string
}

interface HeroVisualStyle {
  backgroundClip: string
  backgroundColor: string
  backgroundImage: string
  borderBottomColor: string
  borderBottomWidth: string
  borderLeftColor: string
  borderLeftWidth: string
  borderRadius: string
  borderRightColor: string
  borderRightWidth: string
  borderTopColor: string
  borderTopWidth: string
  boxShadow: string
  color: string
  fontFamily: string
  fontSize: string
  fontStyle: string
  fontWeight: string
  letterSpacing: string
  lineHeight: string
  opacity: string
  overflowWrap: string
  paddingBottom: string
  paddingLeft: string
  paddingRight: string
  paddingTop: string
  textAlign: string
  textShadow: string
  webkitBackgroundClip: string
  webkitTextFillColor: string
  webkitTextStrokeColor: string
  webkitTextStrokeWidth: string
  whiteSpace: string
  wordBreak: string
}

function readVisualStyle(element: HeroElement): HeroVisualStyle {
  const style = getComputedStyle(element)

  return {
    backgroundClip: style.backgroundClip,
    backgroundColor: style.backgroundColor,
    backgroundImage: style.backgroundImage,
    borderBottomColor: style.borderBottomColor,
    borderBottomWidth: style.borderBottomWidth,
    borderLeftColor: style.borderLeftColor,
    borderLeftWidth: style.borderLeftWidth,
    borderRadius: style.borderRadius,
    borderRightColor: style.borderRightColor,
    borderRightWidth: style.borderRightWidth,
    borderTopColor: style.borderTopColor,
    borderTopWidth: style.borderTopWidth,
    boxShadow: style.boxShadow,
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontStyle: style.fontStyle,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    opacity: style.opacity || '1',
    overflowWrap: style.overflowWrap,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    paddingRight: style.paddingRight,
    paddingTop: style.paddingTop,
    textAlign: style.textAlign,
    textShadow: style.textShadow,
    webkitBackgroundClip: style.getPropertyValue(
      '-webkit-background-clip',
    ),
    webkitTextFillColor: style.getPropertyValue(
      '-webkit-text-fill-color',
    ),
    webkitTextStrokeColor: style.getPropertyValue(
      '-webkit-text-stroke-color',
    ),
    webkitTextStrokeWidth: style.getPropertyValue(
      '-webkit-text-stroke-width',
    ),
    whiteSpace: style.whiteSpace,
    wordBreak: style.wordBreak,
  }
}

export function captureHeroes(
  heroes: ReadonlyMap<string, RegisteredHero> | undefined,
) {
  const snapshots = new Map<string, HeroSnapshot>()

  if (!heroes || typeof document === 'undefined') {
    return snapshots
  }

  for (const [id, hero] of heroes) {
    const { element } = hero
    const rect = measureRestingRect(element)
    if (rect.width <= 0 || rect.height <= 0) {
      continue
    }

    snapshots.set(id, {
      clone: element.cloneNode(true) as HeroElement,
      element,
      rect,
      style: readVisualStyle(element),
      transitionOnUserGestures: hero.transitionOnUserGestures,
    })
  }

  return snapshots
}

function measureRestingRect(element: HeroElement) {
  const ancestors: HTMLElement[] = []
  const originalStyles: InlineMotionStyle[] = []
  let ancestor = element.parentElement

  while (ancestor) {
    const isPageRoute = ancestor.hasAttribute('data-page-route')
    const isScreenRoute =
      ancestor.hasAttribute('data-screen-id') &&
      ancestor.hasAttribute('data-route-phase')
    ancestors.push(ancestor)
    originalStyles.push({
      animation: ancestor.style.animation,
      transform: ancestor.style.transform,
      transition: ancestor.style.transition,
    })

    // Disabling motion on every ancestor makes an in-flight CSS transition
    // resolve to its inline destination before the rect is read. Route layers
    // additionally use an identity transform because covered/exiting screens
    // can intentionally keep an offset after their transition completes.
    ancestor.style.animation = 'none'
    ancestor.style.transition = 'none'
    if (isPageRoute || isScreenRoute) {
      ancestor.style.transform = 'none'
    }
    ancestor = ancestor.parentElement
  }

  try {
    return element.getBoundingClientRect()
  } finally {
    ancestors.forEach((motionElement, index) => {
      const original = originalStyles[index]
      motionElement.style.animation = original.animation
      motionElement.style.transform = original.transform
      motionElement.style.transition = original.transition
    })
  }
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function removeDuplicateIds(element: HeroElement) {
  element.removeAttribute('id')
  element.querySelectorAll('[id]').forEach((descendant) => {
    descendant.removeAttribute('id')
  })
}

function containsText(element: HeroElement) {
  return Boolean(element.textContent?.trim())
}

const transparentSurface = {
  backgroundColor: 'transparent',
  backgroundImage: 'none',
  borderBottomColor: 'transparent',
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderTopColor: 'transparent',
  boxShadow: 'none',
} satisfies Keyframe

function makeContentOnly(
  element: HeroElement,
  style: HeroVisualStyle,
) {
  const clipsBackgroundToText =
    style.backgroundClip === 'text' ||
    style.webkitBackgroundClip === 'text'
  const contentSurface = clipsBackgroundToText
    ? {
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'transparent',
        boxShadow: 'none',
      }
    : transparentSurface

  Object.assign(element.style, contentSurface)
}

function placeOverlay(
  overlay: HeroElement,
  rect: DOMRect,
  style: HeroVisualStyle,
) {
  removeDuplicateIds(overlay)
  overlay.setAttribute('aria-hidden', 'true')
  Object.assign(overlay.style, {
    ...style,
    animation: 'none',
    boxSizing: 'border-box',
    height: `${rect.height}px`,
    left: `${rect.left}px`,
    margin: '0',
    pointerEvents: 'none',
    position: 'fixed',
    top: `${rect.top}px`,
    transform: 'none',
    transition: 'none',
    visibility: 'visible',
    willChange: 'left, top, width, height, border-radius, font-size, opacity',
    width: `${rect.width}px`,
    zIndex: '2147483647',
  })
}

function transitionProperties(duration: number, easing: string) {
  return [
    `background-color ${duration}ms ${easing}`,
    `border ${duration}ms ${easing}`,
    `border-radius ${duration}ms ${easing}`,
    `box-shadow ${duration}ms ${easing}`,
    `color ${duration}ms ${easing}`,
    `font-size ${duration}ms ${easing}`,
    `font-weight ${duration}ms ${easing}`,
    `height ${duration}ms ${easing}`,
    `left ${duration}ms ${easing}`,
    `letter-spacing ${duration}ms ${easing}`,
    `line-height ${duration}ms ${easing}`,
    `opacity ${duration}ms ${easing}`,
    `padding ${duration}ms ${easing}`,
    `top ${duration}ms ${easing}`,
    `width ${duration}ms ${easing}`,
  ].join(', ')
}

export function createHeroTransition(
  snapshots: ReadonlyMap<string, HeroSnapshot>,
  targets: ReadonlyMap<string, RegisteredHero> | undefined,
  {
    duration = HERO_TRANSITION_DURATION,
    easing = HERO_TRANSITION_EASING,
    interactive = false,
  }: HeroTransitionOptions = {},
): HeroTransitionController {
  const cleanups = new Set<() => void>()
  const progressSetters = new Set<(progress: number) => void>()
  let currentProgress = 0
  let settleFrame: number | null = null

  if (
    !targets ||
    snapshots.size === 0 ||
    typeof document === 'undefined' ||
    prefersReducedMotion()
  ) {
    return {
      cancel: () => undefined,
      setProgress: () => undefined,
      settleTo: () => undefined,
    }
  }

  for (const [id, snapshot] of snapshots) {
    const targetHero = targets.get(id)
    if (
      !targetHero ||
      (interactive &&
        (!snapshot.transitionOnUserGestures ||
          !targetHero.transitionOnUserGestures))
    ) {
      continue
    }
    const { element: target } = targetHero

    const targetRect = measureRestingRect(target)
    if (targetRect.width <= 0 || targetRect.height <= 0) {
      continue
    }

    const sourceVisibility = snapshot.element.style.visibility
    const targetVisibility = target.style.visibility
    const targetStyle = readVisualStyle(target)
    const overlay = snapshot.clone
    const crossFadeText =
      containsText(snapshot.element) || containsText(target)
    const targetOverlay = crossFadeText
      ? (target.cloneNode(true) as HeroElement)
      : null
    const shapeOverlay = crossFadeText
      ? (snapshot.clone.cloneNode(true) as HeroElement)
      : null
    const sourceEndLeft =
      targetRect.left + (targetRect.width - snapshot.rect.width) / 2
    const sourceEndTop =
      targetRect.top + (targetRect.height - snapshot.rect.height) / 2
    const targetStartLeft =
      snapshot.rect.left + (snapshot.rect.width - targetRect.width) / 2
    const targetStartTop =
      snapshot.rect.top + (snapshot.rect.height - targetRect.height) / 2
    let finished = false

    snapshot.element.style.visibility = 'hidden'
    target.style.visibility = 'hidden'
    if (shapeOverlay) {
      while (shapeOverlay.firstChild) {
        shapeOverlay.removeChild(shapeOverlay.firstChild)
      }
      shapeOverlay.setAttribute('data-hero-flight-layer', 'shape')
      placeOverlay(shapeOverlay, snapshot.rect, snapshot.style)
      document.body.append(shapeOverlay)
    }
    overlay.setAttribute('data-hero-flight-layer', 'source')
    placeOverlay(overlay, snapshot.rect, snapshot.style)
    if (targetOverlay) {
      makeContentOnly(overlay, snapshot.style)
      overlay.style.maxWidth = `${snapshot.rect.width}px`
      overlay.style.minWidth = `${snapshot.rect.width}px`
    }
    document.body.append(overlay)
    if (targetOverlay) {
      targetOverlay.setAttribute('data-hero-flight-layer', 'target')
      placeOverlay(targetOverlay, targetRect, {
        ...targetStyle,
        opacity: '0',
      })
      makeContentOnly(targetOverlay, targetStyle)
      targetOverlay.style.maxWidth = `${targetRect.width}px`
      targetOverlay.style.minWidth = `${targetRect.width}px`
      targetOverlay.style.left = `${targetStartLeft}px`
      targetOverlay.style.top = `${targetStartTop}px`
      document.body.append(targetOverlay)
    }

    const finish = () => {
      if (finished) {
        return
      }
      finished = true
      overlay.remove()
      targetOverlay?.remove()
      shapeOverlay?.remove()
      if (snapshot.element.isConnected) {
        snapshot.element.style.visibility = sourceVisibility
      }
      if (target.isConnected) {
        target.style.visibility = targetVisibility
      }
      cleanups.delete(finish)
    }
    cleanups.add(finish)

    const applyProgress = (progress: number) => {
      const mix = (from: number, to: number) =>
        from + (to - from) * progress

      if (targetOverlay) {
        if (shapeOverlay) {
          const sourceRadius = Number.parseFloat(
            snapshot.style.borderRadius,
          )
          const targetRadius = Number.parseFloat(targetStyle.borderRadius)
          Object.assign(shapeOverlay.style, {
            borderRadius:
              Number.isFinite(sourceRadius) && Number.isFinite(targetRadius)
                ? `${mix(sourceRadius, targetRadius)}px`
                : progress === 1
                  ? targetStyle.borderRadius
                  : snapshot.style.borderRadius,
            height: `${mix(snapshot.rect.height, targetRect.height)}px`,
            left: `${mix(snapshot.rect.left, targetRect.left)}px`,
            top: `${mix(snapshot.rect.top, targetRect.top)}px`,
            width: `${mix(snapshot.rect.width, targetRect.width)}px`,
          })
        }
        Object.assign(overlay.style, {
          left: `${mix(snapshot.rect.left, sourceEndLeft)}px`,
          opacity: `${1 - progress}`,
          top: `${mix(snapshot.rect.top, sourceEndTop)}px`,
        })
        Object.assign(targetOverlay.style, {
          left: `${mix(targetStartLeft, targetRect.left)}px`,
          opacity: `${progress * Number(targetStyle.opacity)}`,
          top: `${mix(targetStartTop, targetRect.top)}px`,
        })
      } else {
        Object.assign(overlay.style, {
          height: `${mix(snapshot.rect.height, targetRect.height)}px`,
          left: `${mix(snapshot.rect.left, targetRect.left)}px`,
          top: `${mix(snapshot.rect.top, targetRect.top)}px`,
          width: `${mix(snapshot.rect.width, targetRect.width)}px`,
        })
      }
    }

    const startInlineTransition = () => {
      if (interactive) {
        progressSetters.add(applyProgress)
        return
      }

      const transition = transitionProperties(duration, easing)
      overlay.style.transition = transition
      if (shapeOverlay) {
        shapeOverlay.style.transition = transition
      }
      if (targetOverlay) {
        targetOverlay.style.transition = transition
      }
      requestAnimationFrame(() => {
        if (shapeOverlay) {
          Object.assign(shapeOverlay.style, targetStyle)
        }
        if (!targetOverlay) {
          Object.assign(overlay.style, targetStyle)
        }
        applyProgress(1)
      })
      setTimeout(finish, duration)
    }
    startInlineTransition()
  }

  const finishAll = () => {
    for (const cleanup of [...cleanups]) {
      cleanup()
    }
  }

  const cancel = () => {
    if (settleFrame !== null) {
      cancelAnimationFrame(settleFrame)
      settleFrame = null
    }
    finishAll()
  }

  const setProgress = (progress: number) => {
    currentProgress = Math.min(1, Math.max(0, progress))
    for (const setFlightProgress of progressSetters) {
      setFlightProgress(currentProgress)
    }
  }

  const settleTo = (
    progress: 0 | 1,
    settleDuration = duration,
    curve?: PageRouteTransitionCurve,
  ) => {
    if (!interactive) {
      return
    }

    if (settleFrame !== null) {
      cancelAnimationFrame(settleFrame)
    }

    const from = currentProgress
    if (settleDuration <= 0 || from === progress) {
      setProgress(progress)
      finishAll()
      return
    }

    const startedAt = performance.now()
    const update = (time: number) => {
      const elapsed = Math.min(1, (time - startedAt) / settleDuration)
      const curveProgress = curve
        ? curve(elapsed)
        : 1 - Math.pow(1 - elapsed, 3)
      const eased = Number.isFinite(curveProgress)
        ? Math.min(1, Math.max(0, curveProgress))
        : elapsed
      setProgress(from + (progress - from) * eased)

      if (elapsed < 1) {
        settleFrame = requestAnimationFrame(update)
      } else {
        settleFrame = null
        finishAll()
      }
    }
    settleFrame = requestAnimationFrame(update)
  }

  if (interactive) {
    setProgress(0)
  }

  return { cancel, setProgress, settleTo }
}

export function animateHeroes(
  snapshots: ReadonlyMap<string, HeroSnapshot>,
  targets: ReadonlyMap<string, RegisteredHero> | undefined,
  options?: HeroTransitionOptions,
) {
  return createHeroTransition(snapshots, targets, options).cancel
}
