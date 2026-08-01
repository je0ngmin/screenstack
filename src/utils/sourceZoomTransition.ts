export interface SourceZoomTransitionController {
  cancel: () => void
  setProgress: (progress: number) => void
  settleTo: (progress: 0 | 1, duration?: number) => void
}

interface SourceZoomTransitionOptions {
  direction: 'pop' | 'push'
  duration: number
  interactive?: boolean
  sourceBounds?: ZoomTransitionBounds
}

export interface ZoomTransitionBounds {
  height: number
  left: number
  top: number
  width: number
}

const noTransition: SourceZoomTransitionController = {
  cancel: () => undefined,
  setProgress: () => undefined,
  settleTo: () => undefined,
}

const visualStyleProperties = [
  'align-items',
  'background-clip',
  'background-color',
  'background-image',
  'background-origin',
  'background-position',
  'background-repeat',
  'background-size',
  'border-bottom-color',
  'border-bottom-style',
  'border-bottom-width',
  'border-left-color',
  'border-left-style',
  'border-left-width',
  'border-right-color',
  'border-right-style',
  'border-right-width',
  'border-top-color',
  'border-top-style',
  'border-top-width',
  'box-shadow',
  'color',
  'column-gap',
  'display',
  'fill',
  'filter',
  'font-family',
  'font-feature-settings',
  'font-kerning',
  'font-size',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-weight',
  'justify-content',
  'letter-spacing',
  'line-height',
  'object-fit',
  'object-position',
  'outline-color',
  'outline-style',
  'outline-width',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'row-gap',
  'stroke',
  'text-align',
  'text-decoration-color',
  'text-decoration-line',
  'text-decoration-style',
  'text-shadow',
  'text-transform',
  'white-space',
  '-webkit-background-clip',
  '-webkit-text-fill-color',
  '-webkit-text-stroke-color',
  '-webkit-text-stroke-width',
  'word-break',
] as const

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function copyComputedVisualStyles(source: Element, clone: Element) {
  if (
    (clone instanceof HTMLElement || clone instanceof SVGElement) &&
    (source instanceof HTMLElement || source instanceof SVGElement)
  ) {
    const computedStyle = getComputedStyle(source)
    for (const property of visualStyleProperties) {
      clone.style.setProperty(property, computedStyle.getPropertyValue(property))
    }
    clone.style.animation = 'none'
    clone.style.transition = 'none'
  }

  for (let index = 0; index < source.children.length; index += 1) {
    const sourceChild = source.children.item(index)
    const cloneChild = clone.children.item(index)
    if (sourceChild && cloneChild) {
      copyComputedVisualStyles(sourceChild, cloneChild)
    }
  }
}

function removeDuplicateAttributes(element: HTMLElement) {
  element.removeAttribute('id')
  element.removeAttribute('data-testid')
  element.querySelectorAll('[id], [data-testid]').forEach((descendant) => {
    descendant.removeAttribute('id')
    descendant.removeAttribute('data-testid')
  })
}

export function createSourceZoomTransition(
  source: HTMLElement | null,
  page: HTMLElement | null,
  {
    direction,
    duration,
    interactive = false,
    sourceBounds,
  }: SourceZoomTransitionOptions,
): SourceZoomTransitionController {
  if (
    !source ||
    !page ||
    typeof document === 'undefined' ||
    prefersReducedMotion()
  ) {
    return noTransition
  }

  const measuredSourceRect = source.getBoundingClientRect()
  const sourceRect = sourceBounds ?? measuredSourceRect
  const pageRect = page.getBoundingClientRect()
  if (
    sourceRect.width <= 0 ||
    sourceRect.height <= 0 ||
    pageRect.width <= 0 ||
    pageRect.height <= 0
  ) {
    return noTransition
  }

  const sourceVisibility = source.style.visibility
  const sourceStyle = getComputedStyle(source)
  const pageStyle = getComputedStyle(page)
  const sourceRadius = Number.parseFloat(sourceStyle.borderRadius)
  const pageRadius = Number.parseFloat(pageStyle.borderRadius)
  const overlay = source.cloneNode(true) as HTMLElement
  copyComputedVisualStyles(source, overlay)
  removeDuplicateAttributes(overlay)
  overlay.setAttribute('aria-hidden', 'true')
  overlay.setAttribute('data-cupertino-zoom-source-flight', '')
  Object.assign(overlay.style, {
    animation: 'none',
    boxSizing: 'border-box',
    height: `${sourceRect.height}px`,
    left: `${sourceRect.left}px`,
    margin: '0',
    maxHeight: 'none',
    maxWidth: 'none',
    minHeight: '0',
    minWidth: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'fixed',
    top: `${sourceRect.top}px`,
    transform: 'none',
    transition: 'none',
    visibility: 'visible',
    width: `${sourceRect.width}px`,
    willChange: 'border-radius, height, left, opacity, top, width',
    zIndex: '2',
  })

  source.style.visibility = 'hidden'
  document.body.append(overlay)

  let currentProgress = 0
  let finished = false
  let settleFrame: number | null = null

  const mix = (from: number, to: number, progress: number) =>
    from + (to - from) * progress

  const applyProgress = (transitionProgress: number) => {
    currentProgress = Math.min(1, Math.max(0, transitionProgress))
    const geometryProgress =
      direction === 'push' ? currentProgress : 1 - currentProgress
    const opacity = direction === 'push' ? 1 - currentProgress : currentProgress

    Object.assign(overlay.style, {
      borderRadius:
        Number.isFinite(sourceRadius) && Number.isFinite(pageRadius)
          ? `${mix(sourceRadius, pageRadius, geometryProgress)}px`
          : geometryProgress < 0.5
            ? sourceStyle.borderRadius
            : pageStyle.borderRadius,
      height: `${mix(sourceRect.height, pageRect.height, geometryProgress)}px`,
      left: `${mix(sourceRect.left, pageRect.left, geometryProgress)}px`,
      opacity: `${opacity}`,
      top: `${mix(sourceRect.top, pageRect.top, geometryProgress)}px`,
      width: `${mix(sourceRect.width, pageRect.width, geometryProgress)}px`,
    })
  }

  const finish = () => {
    if (finished) {
      return
    }
    finished = true
    overlay.remove()
    if (source.isConnected) {
      source.style.visibility = sourceVisibility
    }
  }

  const cancel = () => {
    if (settleFrame !== null) {
      cancelAnimationFrame(settleFrame)
      settleFrame = null
    }
    finish()
  }

  const settleTo = (
    targetProgress: 0 | 1,
    settleDuration = duration,
  ) => {
    if (settleFrame !== null) {
      cancelAnimationFrame(settleFrame)
    }

    const from = currentProgress
    if (settleDuration <= 0 || from === targetProgress) {
      applyProgress(targetProgress)
      finish()
      return
    }

    const startedAt = performance.now()
    const update = (time: number) => {
      const elapsed = Math.min(1, Math.max(0, (time - startedAt) / settleDuration))
      const eased = 1 - Math.pow(1 - elapsed, 3)
      applyProgress(from + (targetProgress - from) * eased)

      if (elapsed < 1) {
        settleFrame = requestAnimationFrame(update)
      } else {
        settleFrame = null
        finish()
      }
    }
    settleFrame = requestAnimationFrame(update)
  }

  applyProgress(0)
  if (!interactive) {
    settleTo(1, duration)
  }

  return { cancel, setProgress: applyProgress, settleTo }
}
