# Page Routes

Wrap pages in a route component whenever they are pushed onto the stack.

## AdaptivePageRoute

`AdaptivePageRoute` selects `CupertinoPageRoute` on iOS and
`MaterialPageRoute` on other platforms.

```tsx
navigation.push(
  <AdaptivePageRoute>
    <SettingsPage />
  </AdaptivePageRoute>,
)
```

Use the optional `platform` prop when the platform is known by your application
or when testing.

```tsx
<AdaptivePageRoute platform="ios">
  <SettingsPage />
</AdaptivePageRoute>
```

## MaterialPageRoute

Material routes use a short opacity, translation, and scale transition.

```tsx
navigation.push(
  <MaterialPageRoute>
    <ProfilePage />
  </MaterialPageRoute>,
)
```

## CupertinoPageRoute

Cupertino routes enter from the right and support an interactive swipe-back
gesture.

```tsx
navigation.push(
  <CupertinoPageRoute edgeWidth={32}>
    <ProfilePage />
  </CupertinoPageRoute>,
)
```

Set `swipeBackEnabled={false}` to disable the gesture for an individual route.

## CupertinoZoomTransitionPageRoute

`CupertinoZoomTransitionPageRoute` provides an app-style zoom transition like
the navigation transition introduced in iOS 18. Pass a ref belonging to an
element on the previous screen. The new screen expands from that element's
position, size, and border radius, then shrinks back to it on pop.
An actual `overflow: hidden` mask container starts at the source's `left`,
`top`, `width`, `height`, and border radius, then expands to the route bounds.
Inside it, the new route moves and scales into place. Its initial scale is
calculated from `source width / route width` and applied equally to both axes,
so the content keeps its aspect ratio instead of stretching to match the
source height.

The referenced element also participates visually, like a `Hero`. ScreenStack
temporarily hides the original and creates a non-interactive visual clone with
the source's computed styles. The clone's `left`, `top`, `width`, `height`,
border radius, and opacity transition toward the screen bounds while the new
route cross-fades in and the previous screen scales down slightly. Pop reverses
the effect.

During an interactive pop drag, the source stays hidden while the route zooms
out and follows the pointer. If the gesture completes, the source transition
starts only after release and the mask settles into its bounds. If the gesture
is cancelled, the source remains hidden until the route has returned to its
full-screen position.

```tsx
import { useRef } from 'react'
import {
  CupertinoZoomTransitionPageRoute,
  useStackNavigation,
} from 'screenstack'

function GalleryItem() {
  const navigation = useStackNavigation()
  const sourceRef = useRef<HTMLButtonElement>(null)

  return (
    <button
      ref={sourceRef}
      onClick={() =>
        navigation.push(
          <CupertinoZoomTransitionPageRoute sourceRef={sourceRef}>
            <PhotoDetails />
          </CupertinoZoomTransitionPageRoute>,
        )
      }
      style={{ borderRadius: 18 }}
    >
      <PhotoThumbnail />
    </button>
  )
}
```

The source must remain mounted in the previous screen while the zoom route is
on the stack. ScreenStack measures it again before pop, so the return
transition follows its latest layout. `transitionDuration` controls both the
route and Hero transition timing and defaults to `600` ms.

The left-edge gesture follows the pointer horizontally. Releasing a completed
gesture settles the screen into the source element; cancelling it smoothly
returns the screen to its full-screen resting position. As with
`CupertinoPageRoute`, use `edgeWidth` to change the gesture area or
`swipeBackEnabled={false}` to disable it.

## Base PageRoute

`PageRoute` provides the route layout without a platform transition.

```tsx
navigation.push(
  <PageRoute>
    <StaticPage />
  </PageRoute>,
)
```

All route components accept `className` and `style`. The library does not
attach internal styling classes.

## Creating a custom page route

A page route is a screen-level component rendered as the element of a
`StackNavigator` screen. The navigator owns the stack, assigns the route
phase, blocks interaction with covered screens, and removes a screen after a
pop. The route component owns only its visual transition and any interactive
gesture.

Use `usePageRouteTransition()` to read that screen's transition state. The
hook must be called by a component rendered inside a `StackNavigator` screen.

```ts
type PageRoutePhase = 'active' | 'covered' | 'exiting'
```

| Phase | Meaning | Typical route behavior |
| --- | --- | --- |
| `active` | The screen currently shown at the top of the stack. | Show it at its resting position and accept gestures. |
| `covered` | Another screen is above this screen. | Keep it behind the active screen. Any interaction is blocked by `StackNavigator`. |
| `exiting` | The screen is being popped. | Run the pop transition toward its exit state. |

`phase` does not include a separate entering value. A custom route can keep a
local `entered` state and enable it after the initial browser frame. The
following route fades and scales on push and pop without a stylesheet:

```tsx
import {
  useLayoutEffect,
  useState,
} from 'react'
import {
  createCubicBezierCurve,
  usePageRouteTransition,
  type PageRouteProps,
} from 'screenstack'

const duration = 320
const easing = 'cubic-bezier(0.2, 0, 0, 1)'
const curve = createCubicBezierCurve(0.2, 0, 0, 1)

export function FadePageRoute({ children, style }: PageRouteProps) {
  const route = usePageRouteTransition()
  const [entered, setEntered] = useState(false)

  useLayoutEffect(() => {
    let enterFrame = 0
    const initialFrame = requestAnimationFrame(() => {
      enterFrame = requestAnimationFrame(() => setEntered(true))
    })

    return () => {
      cancelAnimationFrame(initialFrame)
      cancelAnimationFrame(enterFrame)
    }
  }, [])

  useLayoutEffect(
    () =>
      route.registerTransition({
        push: { curve, duration, easing },
        pop: { curve, duration, easing },
      }),
    [route],
  )

  const visible = entered && route.phase !== 'exiting'

  return (
    <div
      data-page-route="fade"
      data-route-phase={route.phase}
      style={{
        background: 'Canvas',
        bottom: 0,
        boxSizing: 'border-box',
        height: '100%',
        left: 0,
        overflow: 'auto',
        position: 'absolute',
        right: 0,
        top: 0,
        width: '100%',
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.98)',
        transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
```

::: warning Full-screen route root
Give the route root a non-transparent background and make it fill its screen.
Otherwise, covered screens can remain visible around or through the active
route.
:::

### Synchronizing Hero transitions

`registerTransition()` describes the route's timing independently of a
built-in route component. `StackNavigator` uses `duration` and `easing` for
normal Hero flights, and uses `curve` when an interactive gesture settles
after release. It does not animate the route itself. Keep these values equal
to the route's inline transition. The pop duration also determines when the
exiting screen is removed. `registerHeroTransition()` remains as a deprecated
compatibility alias.

### Adding an interactive pop gesture

A custom route can drive its own pointer gesture and the matching Hero flight
with the same controller:

1. After recognizing a pop gesture, require `phase === 'active'` and `canPop`,
   then call `beginPopGesture()`. Continue only when it returns a controller.
2. While dragging, calculate a normalized progress from `0` to `1`. Apply that
   progress to the route's inline transform and call `gesture.update(progress)`.
3. On release, animate the route to progress `0` or `1`. Call
   `gesture.cancel(duration)` or `gesture.complete(duration)` with the same
   settling duration. Hero uses the pop `curve` registered by the route.
4. While the gesture is active, place a transparent, absolutely positioned
   interaction layer above the route. Set `touchAction: 'none'`,
   `pointerEvents: 'auto'`, and `userSelect: 'none'` inline so scrolling and
   controls inside the route cannot interrupt the gesture.

The controller owns one gesture session and ignores updates after cancel or
complete, so custom routes do not need Hero-specific cleanup code.
`popGestureInProgress` reports whether the navigator currently owns an
interactive pop for that screen. Progress values are clamped by ScreenStack.
