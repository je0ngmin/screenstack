import { useState } from 'react'
import type {
  AdaptivePageRouteProps,
  PageRoutePlatform,
} from '../../types/navigation'
import { CupertinoPageRoute } from './CupertinoPageRoute'
import { MaterialPageRoute } from './MaterialPageRoute'

function detectPlatform(): PageRoutePlatform {
  if (typeof navigator === 'undefined') {
    return 'android'
  }

  const userAgent = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  return isIOS ? 'ios' : 'android'
}

export function AdaptivePageRoute({
  platform,
  ...props
}: AdaptivePageRouteProps) {
  const [detectedPlatform] = useState(detectPlatform)
  const resolvedPlatform = platform ?? detectedPlatform

  return resolvedPlatform === 'ios' ? (
    <CupertinoPageRoute {...props} />
  ) : (
    <MaterialPageRoute {...props} />
  )
}
