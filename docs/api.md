# API

## `StackNavigator`

Creates a navigation context and renders screens as a stack.

Every navigation flow requires a `StackNavigator`. An application may render
multiple navigators for independent stacks or nest navigators for local flows.
When navigators are nested, `useStackNavigation()` returns the closest
navigator's API.

| Prop | Type | Description |
| --- | --- | --- |
| `children` | `ReactNode` | Initial screen content. |
| `initialScreen` | `ReactNode` | Explicit initial content; takes precedence over `children`. |
| `className` | `string` | Optional class name for consumer styling. |
| `ref` | `Ref<StackNavigation>` | Optional imperative navigation ref. |

## `Hero`

Marks an element for a shared-element transition during `push` and `pop`.

```ts
interface HeroProps {
  id: string
  children: ReactElement
  transitionOnUserGestures?: boolean
}
```

Heroes with the same `id` on adjacent screens animate between their positions
and sizes. Text content cross-fades between the two Heroes. Both Heroes must
belong to the same nearest `StackNavigator`. Use each Hero ID only once per
screen.

`transitionOnUserGestures` defaults to `true`. Set it to `false` to keep a
specific Hero out of an interactive pop gesture. Both matching Heroes must
enable the option to participate.

## `usePageRouteTransition()`

Returns the route transition controller from the nearest `StackNavigator`
screen. Custom page routes can use it to drive an interactive Hero transition
without depending on a built-in route component.

```ts
interface PageRouteTransition {
  canPop: boolean
  phase: 'active' | 'covered' | 'exiting'
  popGestureInProgress: boolean
  beginPopGesture(): PageRoutePopGesture | null
  registerTransition(config: {
    push: { duration: number; easing: string; curve?: (progress: number) => number }
    pop: { duration: number; easing: string; curve?: (progress: number) => number }
  }): () => void
}

interface PageRoutePopGesture {
  update(progress: number): void
  cancel(duration?: number): void
  complete(duration?: number): void
}
```

`beginPopGesture()` returns `null` when the gesture cannot start. The returned
controller owns that gesture and drives its Hero flight. Progress is clamped
to the range from `0` to `1`. Finish it exactly once with `cancel()` or
`complete()` using the custom route's settling duration.

Drag updates are applied directly so Hero stays under the pointer. After
release, `cancel()` and `complete()` use the registered pop `curve`. Use
`createCubicBezierCurve(x1, y1, x2, y2)` to create a progress function that
matches the route's inline `cubic-bezier(...)` easing.

The older four-method pop gesture API remains available for compatibility but
is deprecated.

Call `registerTransition()` from a layout effect and return its cleanup.
This keeps normal push and pop Hero flights synchronized with the custom
route's own inline transition timing. Its pop duration also controls when the
exiting screen is removed from the stack. `registerHeroTransition()` remains
as a deprecated compatibility alias.

## `useStackNavigation()`

Returns the current screen's `StackNavigationState` object. It must be called under a
`StackNavigator`.

```ts
interface StackNavigationState extends StackNavigation {
  canGoBack: boolean
  isActive: boolean
  push(element: ReactNode, id?: string): void
  pop(): void
  replace(element: ReactNode, id?: string): void
  reset(element: ReactNode, id?: string): void
}
```

`canGoBack` belongs to the screen where the hook is called. A root screen
therefore keeps `false` after another screen is pushed. `isActive` is `true`
only while that screen is at the top of its nearest navigator; it changes to
`false` when another screen is pushed over it.

### `push`

Adds a screen to the top of the stack.

### `pop`

Removes the active screen after its exit transition. It does nothing on the
root screen.

### `replace`

Replaces the active screen with a new screen.

### `reset`

Removes the current stack and installs a new root screen.

## `useStackNavigationRef()`

Creates a ref for controlling a `StackNavigator` outside its navigation
context.

```tsx
const navigationRef = useStackNavigationRef()

navigationRef.current?.push(<PageRoute>...</PageRoute>)

<StackNavigator ref={navigationRef}>...</StackNavigator>
```

`current` is `null` before the navigator mounts and after it unmounts. Create a
separate ref for each independent or nested navigator. Because a ref is not
bound to a screen, it exposes the navigation methods and navigator-level
`canGoBack`, but not the hook's screen-specific `isActive` state.

## Route components

### `PageRoute`

```ts
interface PageRouteProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}
```

### `MaterialPageRoute`

Accepts `PageRouteProps`.

### `CupertinoPageRoute`

```ts
interface CupertinoPageRouteProps extends PageRouteProps {
  edgeWidth?: number
  swipeBackEnabled?: boolean
}
```

### `CupertinoZoomTransitionPageRoute`

```ts
interface CupertinoZoomTransitionPageRouteProps extends PageRouteProps {
  sourceRef: RefObject<HTMLElement | null>
  edgeWidth?: number
  swipeBackEnabled?: boolean
  transitionDuration?: number
}
```

`sourceRef` identifies the element from which the screen expands and to which
it returns. The referenced element must remain mounted in the preceding
screen. `transitionDuration` defaults to `600` ms and also synchronizes normal
push and pop Hero flights.

### `AdaptivePageRoute`

```ts
type PageRoutePlatform = 'ios' | 'android'

interface AdaptivePageRouteProps extends CupertinoPageRouteProps {
  platform?: PageRoutePlatform
}
```
