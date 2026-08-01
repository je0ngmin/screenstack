# Hero transitions

`Hero` creates a shared-element transition when a screen is pushed or popped.
Wrap the corresponding element on both screens with the same ID.

```tsx
import {
  Hero,
  MaterialPageRoute,
  useStackNavigation,
} from 'screenstack'

function ProductCard() {
  const navigation = useStackNavigation()

  return (
    <button
      onClick={() =>
        navigation.push(
          <MaterialPageRoute>
            <ProductDetails />
          </MaterialPageRoute>,
        )
      }
    >
      <Hero id="product-image">
        <img src="/product.jpg" alt="" width="96" height="96" />
      </Hero>
    </button>
  )
}

function ProductDetails() {
  return (
    <Hero id="product-image">
      <img src="/product.jpg" alt="" width="320" height="240" />
    </Hero>
  )
}
```

The Hero child must render one DOM element. Hero IDs must be unique within a
screen, and matching Heroes must belong to the same nearest `StackNavigator`.
Nested navigators have independent Hero scopes.

The transition animates position, size, border radius, colors, borders,
padding, and typography such as font size and line height. When a Hero contains
text, the old and new content overlap and cross-fade during the flight. The
transition respects the user's reduced-motion preference and is skipped when
reduced motion is enabled.

## Interactive custom routes

`CupertinoPageRoute` drives its Hero flight with the pointer's swipe progress.
A custom page route can use the same navigator-level controller:

```tsx
function CustomPageRoute({ children }: { children: React.ReactNode }) {
  const route = usePageRouteTransition()
  const startX = useRef(0)

  return (
    <div
      onPointerDown={(event) => {
        if (route.startPopGesture()) {
          startX.current = event.clientX
        }
      }}
      onPointerMove={(event) => {
        const progress = (event.clientX - startX.current) / innerWidth
        route.updatePopGesture(progress)
      }}
      onPointerUp={() => route.completePopGesture(300)}
      onPointerCancel={() => route.cancelPopGesture(300)}
    >
      {children}
    </div>
  )
}
```

Call `startPopGesture()` once, pass normalized progress values from `0` to `1`,
and then complete or cancel the gesture. The Hero coordinator remains owned by
`StackNavigator`, so custom routes do not need Hero-specific matching or
overlay code.
