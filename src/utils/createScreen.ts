import type { ReactNode } from 'react'
import type { StackScreen } from '../types/navigation'

let screenSequence = 0

export function createScreen(element: ReactNode, id?: string): StackScreen {
  screenSequence += 1

  return {
    id: id ?? `stack-screen-${screenSequence}`,
    element,
  }
}
