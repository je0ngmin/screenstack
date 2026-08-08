# Hero 전환

`Hero`는 화면을 push하거나 pop할 때 공유 요소 전환을 만듭니다. 두 화면에서 서로
이어질 요소를 같은 ID의 Hero로 감싸세요.

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

Hero의 자식은 하나의 DOM 요소를 렌더링해야 합니다. 한 화면 안에서 Hero ID는
고유해야 하며, 서로 전환될 Hero는 동일한 최인접 `StackNavigator`에 속해야 합니다.
중첩된 내비게이터는 서로 독립적인 Hero 범위를 가집니다.

전환에는 위치, 크기, 모서리 둥글기, 색상, 테두리, 패딩과 글자 크기·행간 등의
타이포그래피가 반영됩니다. Hero에 텍스트가 있으면 이전 콘텐츠와 새 콘텐츠를 같은
위치에 겹쳐 이동 중 교차 페이드합니다. 사용자가 모션 감소 설정을 활성화했다면
애니메이션을 생략합니다.

도착점은 한 번 저장한 좌표가 아니라 실시간 좌표입니다. ScreenStack은 매 애니메이션
프레임마다 Route에서 상속된 transform을 포함해 대상 Hero의 현재 화면 geometry를
읽습니다. translate, scale, rotation이 Hero 이동에 반영되며 mount 이후 레이아웃이
바뀌어도 Hero가 향하는 위치가 자동으로 갱신됩니다.

## 인터랙티브 사용자 정의 라우트

`CupertinoPageRoute`는 포인터의 스와이프 진행률로 Hero 이동을 구동합니다. 사용자
정의 페이지 라우트도 같은 Navigator 단위 컨트롤러를 사용할 수 있습니다.

```tsx
function CustomPageRoute({ children }: { children: React.ReactNode }) {
  const route = usePageRouteTransition()
  const startX = useRef(0)
  const gesture = useRef<ReturnType<typeof route.beginPopGesture>>(null)

  return (
    <div
      onPointerDown={(event) => {
        gesture.current = route.beginPopGesture()
        if (gesture.current) {
          startX.current = event.clientX
        }
      }}
      onPointerMove={(event) => {
        const progress = (event.clientX - startX.current) / innerWidth
        gesture.current?.update(progress)
      }}
      onPointerUp={() => gesture.current?.complete(300)}
      onPointerCancel={() => gesture.current?.cancel(300)}
    >
      {children}
    </div>
  )
}
```

`beginPopGesture()`를 한 번 호출하고 반환된 controller에 `0`부터 `1`까지 정규화한
진행률을 전달한 다음 제스처를 완료하거나 취소하세요. Hero coordinator는 계속 `StackNavigator`가 관리하므로
사용자 정의 라우트에 Hero 매칭이나 오버레이 코드를 작성할 필요가 없습니다.
