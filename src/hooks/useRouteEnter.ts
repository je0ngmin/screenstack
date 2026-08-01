import {
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react'

export function useRouteEnter(
  elementRef?: RefObject<HTMLElement | null>,
) {
  const [entered, setEntered] = useState(false)

  useLayoutEffect(() => {
    // Commit the off-screen inline style before enabling its transition.
    elementRef?.current?.getBoundingClientRect()

    if (typeof requestAnimationFrame === 'undefined') {
      setEntered(true)
      return
    }

    let enterFrame: number | null = null
    const initialFrame = requestAnimationFrame(() => {
      enterFrame = requestAnimationFrame(() => setEntered(true))
    })

    return () => {
      cancelAnimationFrame(initialFrame)
      if (enterFrame !== null) {
        cancelAnimationFrame(enterFrame)
      }
    }
  }, [elementRef])

  return entered
}
