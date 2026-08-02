export function isInsideHorizontalScrollArea(
  target: EventTarget | null,
  boundary: HTMLElement | null,
) {
  if (!(target instanceof Element) || !boundary) {
    return false
  }

  let element: Element | null = target
  while (element) {
    if (element instanceof HTMLElement) {
      const { overflowX } = getComputedStyle(element)
      const allowsHorizontalScroll =
        overflowX === 'auto' ||
        overflowX === 'scroll' ||
        overflowX === 'overlay'

      if (
        allowsHorizontalScroll &&
        element.scrollWidth > element.clientWidth
      ) {
        return true
      }
    }

    if (element === boundary) {
      break
    }
    element = element.parentElement
  }

  return false
}
