import type { PageRouteTransitionCurve } from '../types/navigation'

const NEWTON_ITERATIONS = 8
const NEWTON_MIN_SLOPE = 0.001
const BISECTION_ITERATIONS = 12

function clampProgress(progress: number) {
  return Math.min(1, Math.max(0, progress))
}

export function createCubicBezierCurve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): PageRouteTransitionCurve {
  const sample = (t: number, first: number, second: number) => {
    const inverse = 1 - t
    return (
      3 * inverse * inverse * t * first +
      3 * inverse * t * t * second +
      t * t * t
    )
  }
  const slope = (t: number) =>
    3 * (1 - t) * (1 - t) * x1 +
    6 * (1 - t) * t * (x2 - x1) +
    3 * t * t * (1 - x2)

  return (progress) => {
    const x = clampProgress(progress)
    if (x === 0 || x === 1) {
      return x
    }

    let parameter = x
    for (let iteration = 0; iteration < NEWTON_ITERATIONS; iteration += 1) {
      const currentSlope = slope(parameter)
      if (Math.abs(currentSlope) < NEWTON_MIN_SLOPE) {
        break
      }
      parameter -= (sample(parameter, x1, x2) - x) / currentSlope
      parameter = clampProgress(parameter)
    }

    let lower = 0
    let upper = 1
    for (
      let iteration = 0;
      iteration < BISECTION_ITERATIONS;
      iteration += 1
    ) {
      const sampledX = sample(parameter, x1, x2)
      if (Math.abs(sampledX - x) < 0.000001) {
        break
      }
      if (sampledX < x) {
        lower = parameter
      } else {
        upper = parameter
      }
      parameter = (lower + upper) / 2
    }

    return clampProgress(sample(parameter, y1, y2))
  }
}
