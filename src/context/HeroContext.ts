import { createContext } from 'react'

export type HeroElement = HTMLElement | SVGElement

export interface RegisteredHero {
  element: HeroElement
  transitionOnUserGestures: boolean
}

export interface HeroScope {
  registerHero: (id: string, hero: RegisteredHero) => () => void
}

export const HeroContext = createContext<HeroScope | null>(null)
