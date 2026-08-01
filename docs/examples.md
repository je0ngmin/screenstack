# Examples

## Animate a shared element

```tsx
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

## Choose a route at push time

```tsx
const navigation = useStackNavigation()

navigation.push(
  <MaterialPageRoute>
    <CheckoutPage />
  </MaterialPageRoute>,
)

navigation.push(
  <CupertinoPageRoute>
    <PhotoPage />
  </CupertinoPageRoute>,
)
```

## Replace the active page

```tsx
navigation.replace(
  <AdaptivePageRoute>
    <SuccessPage />
  </AdaptivePageRoute>,
)
```

## Reset after sign out

```tsx
navigation.reset(
  <AdaptivePageRoute>
    <SignInPage />
  </AdaptivePageRoute>,
)
```

## Disable swipe back

```tsx
navigation.push(
  <CupertinoPageRoute swipeBackEnabled={false}>
    <RequiredFlowPage />
  </CupertinoPageRoute>,
)
```

For a runnable application, see the `examples/basic` workspace project.
