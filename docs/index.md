---
layout: home

hero:
  name: ScreenStack
  text: App-style screen navigation for the web.
  tagline: Push and pop screens with Material, Cupertino, or adaptive transitions.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View API
      link: /api

features:
  - title: Route Components
    details: Use Material, Cupertino, adaptive, or iOS-style source zoom page routes.
  - title: Interactive iOS Gestures
    details: Swipe from the route's left edge to drag the active page in sync with your pointer.
  - title: Inline Styles
    details: Navigation layout and transitions are implemented without a required library stylesheet.
  - title: Composable Navigators
    details: Create independent stacks with multiple StackNavigators or nest them for local navigation flows.
---

## Screen-Stack Navigation

```tsx
navigation.push(
  <AdaptivePageRoute>
    <DetailPage />
  </AdaptivePageRoute>,
)
```
