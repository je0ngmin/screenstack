import type { CSSProperties } from 'react'

export const navigatorStyle: CSSProperties = {
  isolation: 'isolate',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
}

export const screenStyle: CSSProperties = {
  bottom: 0,
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
}

export const pageRouteStyle: CSSProperties = {
  background: 'Canvas',
  boxSizing: 'border-box',
  height: '100%',
  bottom: 0,
  left: 0,
  overflow: 'auto',
  position: 'absolute',
  right: 0,
  top: 0,
  width: '100%',
  willChange: 'opacity, transform',
}
