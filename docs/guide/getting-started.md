# Getting Started

ScreenStack provides a stack navigator and page route components for
React.

## Install

```bash
pnpm add screenstack
```

React and React DOM are peer dependencies. The library supports React 18 and
newer.

::: warning StackNavigator is required
Navigation only works inside a `StackNavigator`. The `useStackNavigation()`
hook reads the closest navigator above the calling component.
:::

## Create a navigator

Render `StackNavigator` inside a container with a defined height. Route screens
are positioned to fill that container.

```tsx
import {
  AdaptivePageRoute,
  StackNavigator,
  useStackNavigation,
} from 'screenstack'

function DetailsPage() {
  const navigation = useStackNavigation()

  return <button onClick={navigation.pop}>Back</button>
}

function HomePage() {
  const navigation = useStackNavigation()

  return (
    <button
      onClick={() =>
        navigation.push(
          <AdaptivePageRoute>
            <DetailsPage />
          </AdaptivePageRoute>,
        )
      }
    >
      Open details
    </button>
  )
}

export function App() {
  return (
    <div style={{ height: '100dvh' }}>
      <StackNavigator>
        <AdaptivePageRoute>
          <HomePage />
        </AdaptivePageRoute>
      </StackNavigator>
    </div>
  )
}
```

No library CSS import is required. Navigation layout and transitions use inline
React styles.

## Multiple and nested navigators

An application can render multiple `StackNavigator` components. Each navigator
owns an independent screen stack and navigation history.

Navigators can also be nested:

```tsx
<StackNavigator>
  <PageRoute>
    <MainPage>
      <StackNavigator>
        <PageRoute>
          <LocalFlowPage />
        </PageRoute>
      </StackNavigator>
    </MainPage>
  </PageRoute>
</StackNavigator>
```

Inside `LocalFlowPage`, `useStackNavigation()` controls the inner navigator
because it is the closest `StackNavigator`. Components outside the inner
navigator continue to use the outer stack.

## Run the workspace example

This repository contains a Vite React app under `examples/basic`.

```bash
pnpm dev
```
