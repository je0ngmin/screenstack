# ScreenStack

[English](./README.md) | [한국어](./README.ko.md)

**App-style screen navigation for the web.**

ScreenStack is a lightweight, type-safe screen stack for React applications.

## StackNavigator

All navigation APIs must be used inside a `StackNavigator`.
`useStackNavigation()` returns the navigation object from the closest
`StackNavigator` above the calling component.

An application may render multiple `StackNavigator` components. Each one owns
an independent screen stack. Navigators may also be nested; descendants of a
nested navigator control the nearest, inner stack.

To control a navigator from outside its context, connect a ref created by
`useStackNavigationRef()`:

```tsx
function App() {
  const navigationRef = useStackNavigationRef()

  return (
    <>
      <button
        onClick={() =>
          navigationRef.current?.push(
            <PageRoute>
              <DetailsPage />
            </PageRoute>,
          )
        }
      >
        Open
      </button>
      <StackNavigator ref={navigationRef}>
        <PageRoute>
          <HomePage />
        </PageRoute>
      </StackNavigator>
    </>
  )
}
```

## Installation

```bash
npm i screenstack
yarn add screenstack
pnpm i screenstack
```

## Usage

```tsx
import {
  AdaptivePageRoute,
  StackNavigator,
  useStackNavigation,
} from 'screenstack'

function HomePage() {
  const { push, pop } = useStackNavigation()

  return (
    <>
      <button
        onClick={() =>
          push(
            <AdaptivePageRoute>
              <DetailsPage />
            </AdaptivePageRoute>,
          )
        }
      >
        Open
      </button>
      <button onClick={pop}>Back</button>
    </>
  )
}

export function App() {
  return (
    <StackNavigator>
      <AdaptivePageRoute>
        <HomePage />
      </AdaptivePageRoute>
    </StackNavigator>
  )
}
```

Choose a transition explicitly with `MaterialPageRoute` or
`CupertinoPageRoute`. `AdaptivePageRoute` uses the Cupertino transition on iOS
and the Material transition on Android and other platforms.
`CupertinoPageRoute` also supports an interactive back gesture that begins at
the left screen edge.

`CupertinoZoomTransitionPageRoute` expands a screen from a referenced element
and returns it to the same element on pop. It also supports an interactive
swipe-back gesture inspired by the zoom transition introduced in iOS 18.

## Hero transitions

Wrap corresponding elements on the previous and newly pushed screens in
`Hero` components with the same ID:

```tsx
<Hero id="profile-avatar">
  <img src="/avatar.jpg" alt="" />
</Hero>
```

Matching Heroes animate between their positions and sizes during `push` and
`pop`. Heroes containing text cross-fade the old and new content while they
move. They must belong to the same nearest `StackNavigator`, and each ID must
be unique within its screen.
