import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'

type InteractionGuardProps = ComponentPropsWithoutRef<'div'>

export function InteractionGuard(props: InteractionGuardProps) {
  const guardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const guard = guardRef.current
    if (!guard) {
      return
    }

    const preventScroll = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }

    guard.addEventListener('touchmove', preventScroll, { passive: false })
    guard.addEventListener('wheel', preventScroll, { passive: false })

    return () => {
      guard.removeEventListener('touchmove', preventScroll)
      guard.removeEventListener('wheel', preventScroll)
    }
  }, [])

  return <div {...props} ref={guardRef} />
}
