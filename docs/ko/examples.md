# 예제

## 공유 요소 애니메이션 적용하기

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

## Push할 때 라우트 선택하기

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

## 현재 페이지 교체하기

```tsx
navigation.replace(
  <AdaptivePageRoute>
    <SuccessPage />
  </AdaptivePageRoute>,
)
```

## 로그아웃 후 스택 초기화하기

```tsx
navigation.reset(
  <AdaptivePageRoute>
    <SignInPage />
  </AdaptivePageRoute>,
)
```

## 스와이프 뒤로 가기 비활성화하기

```tsx
navigation.push(
  <CupertinoPageRoute swipeBackEnabled={false}>
    <RequiredFlowPage />
  </CupertinoPageRoute>,
)
```

실행 가능한 애플리케이션은 `examples/basic` workspace 프로젝트에서 확인할 수 있습니다.
