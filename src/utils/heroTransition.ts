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
  geometry: HeroGeometry
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
  curve?: PageRouteTransitionCurve
  duration?: number
  easing?: string
  interactive?: boolean
}

interface HeroGeometry {
  height: number
  matrix: LinearTransform
  rect: DOMRect
  width: number
}

interface LinearTransform {
  a: number
  b: number
  c: number
  d: number
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
    const geometry = measureCurrentGeometry(element)
    const { rect } = geometry
    if (rect.width <= 0 || rect.height <= 0) {
      continue
    }

    snapshots.set(id, {
      clone: element.cloneNode(true) as HeroElement,
      element,
      geometry,
      rect,
      style: readVisualStyle(element),
      transitionOnUserGestures: hero.transitionOnUserGestures,
    })
  }

  return snapshots
}

function multiplyLinearTransforms(
  left: LinearTransform,
  right: LinearTransform,
): LinearTransform {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
  }
}

function parseLinearTransform(transform: string): LinearTransform | null {
  try {
    const matrix = new DOMMatrixReadOnly(transform)
    return { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d }
  } catch {
    const values = transform
      .slice(transform.indexOf('(') + 1, transform.lastIndexOf(')'))
      .split(',')
      .map(Number)

    if (
      transform.startsWith('matrix3d(') &&
      values.length === 16 &&
      values.every(Number.isFinite)
    ) {
      return { a: values[0], b: values[1], c: values[4], d: values[5] }
    }
    if (
      transform.startsWith('matrix(') &&
      values.length === 6 &&
      values.every(Number.isFinite)
    ) {
      return { a: values[0], b: values[1], c: values[2], d: values[3] }
    }
    return null
  }
}

function readLinearTransform(element: HeroElement): LinearTransform {
  const hierarchy: Element[] = []
  let current: Element | null = element

  while (current) {
    hierarchy.push(current)
    current = current.parentElement
  }

  let combined: LinearTransform = { a: 1, b: 0, c: 0, d: 1 }
  for (const transformElement of hierarchy.reverse()) {
    const transform = getComputedStyle(transformElement).transform
    if (!transform || transform === 'none') {
      continue
    }

    const matrix = parseLinearTransform(transform)
    if (matrix) {
      combined = multiplyLinearTransforms(combined, matrix)
    }
  }

  return combined
}

function readUntransformedSize(
  element: HeroElement,
  rect: DOMRect,
  matrix: LinearTransform,
) {
  const absoluteA = Math.abs(matrix.a)
  const absoluteB = Math.abs(matrix.b)
  const absoluteC = Math.abs(matrix.c)
  const absoluteD = Math.abs(matrix.d)
  const determinant =
    absoluteA * absoluteD - absoluteB * absoluteC

  if (Math.abs(determinant) > 0.000001) {
    const width =
      (rect.width * absoluteD - rect.height * absoluteC) /
      determinant
    const height =
      (rect.height * absoluteA - rect.width * absoluteB) /
      determinant
    if (
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
    ) {
      return { height, width }
    }
  }

  if (element instanceof HTMLElement) {
    return {
      height: element.offsetHeight || rect.height,
      width: element.offsetWidth || rect.width,
    }
  }

  if ('getBBox' in element) {
    try {
      const box = (element as SVGGraphicsElement).getBBox()
      if (box.width > 0 && box.height > 0) {
        return { height: box.height, width: box.width }
      }
    } catch {
      // Fall back to the transformed bounds for non-renderable SVG nodes.
    }
  }

  const scaleX = Math.hypot(matrix.a, matrix.b) || 1
  const scaleY = Math.hypot(matrix.c, matrix.d) || 1
  return {
    height: rect.height / scaleY,
    width: rect.width / scaleX,
  }
}

function measureCurrentGeometry(element: HeroElement): HeroGeometry {
  const rect = element.getBoundingClientRect()
  const matrix = readLinearTransform(element)
  const size = readUntransformedSize(element, rect, matrix)

  return { ...size, matrix, rect }
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
  geometry: HeroGeometry,
  style: HeroVisualStyle,
) {
  const { height, matrix, rect, width } = geometry
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  removeDuplicateIds(overlay)
  overlay.setAttribute('aria-hidden', 'true')
  Object.assign(overlay.style, {
    ...style,
    animation: 'none',
    boxSizing: 'border-box',
    height: `${height}px`,
    left: `${centerX - width / 2}px`,
    margin: '0',
    pointerEvents: 'none',
    position: 'fixed',
    top: `${centerY - height / 2}px`,
    transform: `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, 0, 0)`,
    transformOrigin: 'center center',
    transition: 'none',
    visibility: 'visible',
    willChange:
      'left, top, width, height, transform, border-radius, font-size, opacity',
    width: `${width}px`,
    zIndex: '2147483647',
  })
}

function transitionProperties(duration: number, easing: string) {
  return [
    `background-color ${duration}ms ${easing}`,
    `border ${duration}ms ${easing}`,
    `box-shadow ${duration}ms ${easing}`,
    `color ${duration}ms ${easing}`,
    `font-size ${duration}ms ${easing}`,
    `font-weight ${duration}ms ${easing}`,
    `letter-spacing ${duration}ms ${easing}`,
    `line-height ${duration}ms ${easing}`,
    `padding ${duration}ms ${easing}`,
  ].join(', ')
}

export function createHeroTransition(
  snapshots: ReadonlyMap<string, HeroSnapshot>,
  targets: ReadonlyMap<string, RegisteredHero> | undefined,
  {
    curve,
    duration = HERO_TRANSITION_DURATION,
    easing = HERO_TRANSITION_EASING,
    interactive = false,
  }: HeroTransitionOptions = {},
): HeroTransitionController {
  const cleanups = new Set<() => void>()
  const progressSetters = new Set<(progress: number) => void>()
  let currentProgress = 0
  let animationFrame: number | null = null
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

    let targetGeometry = measureCurrentGeometry(target)
    if (
      targetGeometry.rect.width <= 0 ||
      targetGeometry.rect.height <= 0
    ) {
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
    let finished = false

    snapshot.element.style.visibility = 'hidden'
    target.style.visibility = 'hidden'
    if (shapeOverlay) {
      while (shapeOverlay.firstChild) {
        shapeOverlay.removeChild(shapeOverlay.firstChild)
      }
      shapeOverlay.setAttribute('data-hero-flight-layer', 'shape')
      placeOverlay(shapeOverlay, snapshot.geometry, snapshot.style)
      document.body.append(shapeOverlay)
    }
    overlay.setAttribute('data-hero-flight-layer', 'source')
    placeOverlay(overlay, snapshot.geometry, snapshot.style)
    if (targetOverlay) {
      makeContentOnly(overlay, snapshot.style)
      overlay.style.maxWidth = `${snapshot.geometry.width}px`
      overlay.style.minWidth = `${snapshot.geometry.width}px`
    }
    document.body.append(overlay)
    if (targetOverlay) {
      targetOverlay.setAttribute('data-hero-flight-layer', 'target')
      placeOverlay(targetOverlay, targetGeometry, {
        ...targetStyle,
        opacity: '0',
      })
      makeContentOnly(targetOverlay, targetStyle)
      targetOverlay.style.height = `${targetGeometry.height}px`
      targetOverlay.style.maxWidth = `${targetGeometry.width}px`
      targetOverlay.style.minWidth = `${targetGeometry.width}px`
      targetOverlay.style.left = `${snapshot.rect.left + snapshot.rect.width / 2 - targetGeometry.width / 2}px`
      targetOverlay.style.top = `${snapshot.rect.top + snapshot.rect.height / 2 - targetGeometry.height / 2}px`
      targetOverlay.style.transform = `matrix(${snapshot.geometry.matrix.a}, ${snapshot.geometry.matrix.b}, ${snapshot.geometry.matrix.c}, ${snapshot.geometry.matrix.d}, 0, 0)`
      targetOverlay.style.width = `${targetGeometry.width}px`
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

      if (target.isConnected) {
        const nextGeometry = measureCurrentGeometry(target)
        if (
          nextGeometry.rect.width > 0 &&
          nextGeometry.rect.height > 0
        ) {
          targetGeometry = nextGeometry
        }
      }

      const { height, matrix, rect, width } = targetGeometry
      const sourceCenterX = snapshot.rect.left + snapshot.rect.width / 2
      const sourceCenterY = snapshot.rect.top + snapshot.rect.height / 2
      const targetCenterX = rect.left + rect.width / 2
      const targetCenterY = rect.top + rect.height / 2
      const centerX = mix(sourceCenterX, targetCenterX)
      const centerY = mix(sourceCenterY, targetCenterY)
      const sourceMatrix = snapshot.geometry.matrix
      const flightTransform = `matrix(${mix(sourceMatrix.a, matrix.a)}, ${mix(sourceMatrix.b, matrix.b)}, ${mix(sourceMatrix.c, matrix.c)}, ${mix(sourceMatrix.d, matrix.d)}, 0, 0)`

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
            height: `${mix(snapshot.geometry.height, height)}px`,
            left: `${centerX - mix(snapshot.geometry.width, width) / 2}px`,
            opacity: `${mix(Number(snapshot.style.opacity), Number(targetStyle.opacity))}`,
            top: `${centerY - mix(snapshot.geometry.height, height) / 2}px`,
            transform: flightTransform,
            width: `${mix(snapshot.geometry.width, width)}px`,
          })
        }
        Object.assign(overlay.style, {
          left: `${centerX - snapshot.geometry.width / 2}px`,
          opacity: `${1 - progress}`,
          top: `${centerY - snapshot.geometry.height / 2}px`,
          transform: flightTransform,
        })
        Object.assign(targetOverlay.style, {
          height: `${height}px`,
          left: `${centerX - width / 2}px`,
          maxWidth: `${width}px`,
          minWidth: `${width}px`,
          opacity: `${progress * Number(targetStyle.opacity)}`,
          top: `${centerY - height / 2}px`,
          transform: flightTransform,
          width: `${width}px`,
        })
      } else {
        const flightWidth = mix(snapshot.geometry.width, width)
        const flightHeight = mix(snapshot.geometry.height, height)
        const sourceRadius = Number.parseFloat(
          snapshot.style.borderRadius,
        )
        const targetRadius = Number.parseFloat(targetStyle.borderRadius)
        Object.assign(overlay.style, {
          borderRadius:
            Number.isFinite(sourceRadius) && Number.isFinite(targetRadius)
              ? `${mix(sourceRadius, targetRadius)}px`
              : progress === 1
                ? targetStyle.borderRadius
                : snapshot.style.borderRadius,
          height: `${flightHeight}px`,
          left: `${centerX - flightWidth / 2}px`,
          opacity: `${mix(Number(snapshot.style.opacity), Number(targetStyle.opacity))}`,
          top: `${centerY - flightHeight / 2}px`,
          transform: flightTransform,
          width: `${flightWidth}px`,
        })
      }
    }

    const startInlineTransition = () => {
      progressSetters.add(applyProgress)
      if (interactive) {
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
      })
    }
    startInlineTransition()
  }

  const finishAll = () => {
    for (const cleanup of [...cleanups]) {
      cleanup()
    }
  }

  const cancel = () => {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
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
  } else if (duration <= 0) {
    setProgress(1)
    finishAll()
  } else {
    let startedAt: number | null = null
    const update = (time: number) => {
      startedAt ??= time
      const elapsed = Math.min(1, (time - startedAt) / duration)
      const curveProgress = curve
        ? curve(elapsed)
        : 1 - Math.pow(1 - elapsed, 3)
      const eased = Number.isFinite(curveProgress)
        ? Math.min(1, Math.max(0, curveProgress))
        : elapsed
      setProgress(eased)

      if (elapsed < 1) {
        animationFrame = requestAnimationFrame(update)
      } else {
        animationFrame = null
        finishAll()
      }
    }
    animationFrame = requestAnimationFrame(update)
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
