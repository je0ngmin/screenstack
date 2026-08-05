# 페이지 라우트

페이지를 스택에 push할 때마다 라우트 컴포넌트로 감싸세요.

## AdaptivePageRoute

`AdaptivePageRoute`는 iOS에서 `CupertinoPageRoute`를 선택하고, 그 외 플랫폼에서는
`MaterialPageRoute`를 선택합니다.

```tsx
navigation.push(
  <AdaptivePageRoute>
    <SettingsPage />
  </AdaptivePageRoute>,
)
```

애플리케이션에서 플랫폼을 이미 알고 있거나 테스트 중이라면 선택적 `platform` prop을 사용할 수
있습니다.

```tsx
<AdaptivePageRoute platform="ios">
  <SettingsPage />
</AdaptivePageRoute>
```

## MaterialPageRoute

Material 라우트는 짧은 opacity, 이동 및 scale 전환 효과를 사용합니다.

```tsx
navigation.push(
  <MaterialPageRoute>
    <ProfilePage />
  </MaterialPageRoute>,
)
```

## CupertinoPageRoute

Cupertino 라우트는 오른쪽에서 진입하며 인터랙티브 스와이프 뒤로 가기 제스처를 지원합니다.

```tsx
navigation.push(
  <CupertinoPageRoute edgeWidth={32}>
    <ProfilePage />
  </CupertinoPageRoute>,
)
```

개별 라우트에서 제스처를 비활성화하려면 `swipeBackEnabled={false}`를 지정하세요.

## CupertinoZoomTransitionPageRoute

`CupertinoZoomTransitionPageRoute`는 iOS 18에서 도입된 내비게이션 전환과 같은 앱 스타일
zoom 전환을 제공합니다. 이전 화면 요소의 ref를 전달하면 새 화면이 해당 요소의 위치, 크기,
border radius에서 확대되고, pop할 때 같은 요소로 다시 축소됩니다.
실제 `overflow: hidden` 마스크 컨테이너가 source의 `left`, `top`, `width`, `height` 및
border radius에서 시작해 Route 전체 크기로 확장됩니다. 그 안에서 새 Route를 이동하고
확대합니다. 시작 scale은 `source 너비 / route 너비`로 계산해 X축과 Y축에 동일하게 적용하므로,
source 높이에 억지로 맞추지 않고 콘텐츠의 원래 비율을 유지합니다.

ref로 지정한 요소도 `Hero`처럼 시각적 전환에 참여합니다. 원본을 잠시 숨기고 source의
computed style을 가진 상호작용 없는 시각적 복제본을 생성합니다. 복제본의 `left`, `top`,
`width`, `height`, border radius 및 opacity가 화면 크기에 맞춰 자연스럽게 변하는 동안 새
Route가 교차 fade되고 기존 화면은 살짝 축소됩니다. pop에서는 이 동작이 반대로 실행됩니다.

인터랙티브 pop을 드래그하는 동안에는 source를 숨기고 Route만 포인터 방향으로 zoom-out하며
이동합니다. pop이 확정되면 손을 놓은 시점부터 source 전환을 시작하고 마스크가 source 영역으로
이동합니다. 취소하면 Route가 전체 화면으로 돌아올 때까지 source를 계속 숨깁니다.

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

zoom 라우트가 스택에 있는 동안 source 요소는 이전 화면에 mount된 상태로 남아 있어야 합니다.
ScreenStack은 pop 직전에 요소를 다시 측정하므로 레이아웃이 바뀌었어도 최신 위치로 돌아갑니다.
`transitionDuration`은 라우트와 Hero 전환 시간을 함께 설정하며 기본값은 `600`ms입니다.

왼쪽 가장자리 제스처 중에는 포인터를 따라 화면이 가로로 움직입니다. 완료되는 제스처를 놓으면
화면이 source 요소로 부드럽게 축소되고, 취소하면 전체 화면 기본 위치로 돌아옵니다.
`CupertinoPageRoute`와 마찬가지로 `edgeWidth`로 제스처 영역을 변경하거나
`swipeBackEnabled={false}`로 비활성화할 수 있습니다.

## 기본 PageRoute

`PageRoute`는 플랫폼별 전환 효과 없이 라우트 레이아웃만 제공합니다.

```tsx
navigation.push(
  <PageRoute>
    <StaticPage />
  </PageRoute>,
)
```

모든 라우트 컴포넌트는 `className`과 `style`을 지원합니다. 라이브러리는 내부 스타일용 class를
추가하지 않습니다.

## 커스텀 페이지 라우트 만들기

페이지 라우트는 `StackNavigator` 화면의 요소로 렌더링되는 화면 단위 컴포넌트입니다.
내비게이터는 스택 관리, 라우트 phase 지정, 가려진 화면의 상호작용 차단, pop 이후 화면
제거를 담당합니다. 라우트 컴포넌트는 시각적 전환과 필요한 인터랙티브 제스처만 담당합니다.

현재 화면의 전환 상태는 `usePageRouteTransition()`으로 읽을 수 있습니다. 이 훅을 호출하는
컴포넌트는 반드시 `StackNavigator` 화면 안에서 렌더링되어야 합니다.

```ts
type PageRoutePhase = 'active' | 'covered' | 'exiting'
```

| Phase | 의미 | 일반적인 라우트 동작 |
| --- | --- | --- |
| `active` | 현재 스택 맨 위에 표시되는 화면입니다. | 화면을 기본 위치에 표시하고 제스처를 허용합니다. |
| `covered` | 다른 화면이 이 화면 위에 있습니다. | 활성 화면 뒤에 유지합니다. 내부 상호작용은 `StackNavigator`가 차단합니다. |
| `exiting` | 화면이 pop되는 중입니다. | 화면이 사라지는 방향으로 pop 전환을 실행합니다. |

`phase`에는 별도의 진입 상태가 없습니다. 커스텀 라우트가 자체 `entered` 상태를 만들고 첫
브라우저 프레임 이후 활성화하면 됩니다. 다음 라우트는 별도의 스타일시트 없이 push와
pop에서 fade 및 scale 전환을 실행합니다.

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

::: warning 전체 화면 라우트 루트
라우트 루트에는 불투명한 배경을 지정하고 화면 전체를 채우는 레이아웃을 적용하세요. 그렇지
않으면 활성 라우트의 주변이나 투명한 부분을 통해 이전 화면이 보일 수 있습니다.
:::

### Hero 전환 동기화

`registerTransition()`은 내장 Route 컴포넌트와 무관하게 Route의 timing을 등록합니다.
`StackNavigator`는 일반 Hero 이동에 `duration`과 `easing`을 사용하고, 인터랙티브 제스처에서
손을 놓은 뒤에는 `curve`를 사용합니다. Route 자체를 애니메이션하는 함수는 아니므로 inline
transition과 동일한 값을 등록하세요. pop duration은 종료 화면을 제거하는 시점에도 사용됩니다.
`registerHeroTransition()`은 호환성을 위한 deprecated alias로 유지됩니다.

### 인터랙티브 pop 제스처 추가

커스텀 라우트는 같은 컨트롤러로 포인터 제스처와 Hero 이동을 함께 제어할 수 있습니다.

1. pop 제스처를 인식한 뒤 `phase === 'active'`와 `canPop`을 확인하고
   `beginPopGesture()`를 호출합니다. controller가 반환될 때만 계속합니다.
2. 드래그 중 `0`부터 `1` 사이의 진행률을 계산합니다. 라우트의 inline transform에 해당
   진행률을 적용하고 `gesture.update(progress)`를 호출합니다.
3. 포인터를 놓으면 라우트를 진행률 `0` 또는 `1`로 애니메이션합니다. 동일한 마무리
   duration을 전달하여 `gesture.cancel(duration)` 또는
   `gesture.complete(duration)`을 호출합니다. Hero는 Route가 등록한 pop `curve`를 사용합니다.
4. 제스처 도중 라우트 위에 투명한 absolute 상호작용 레이어를 배치하세요. 라우트 내부의
   스크롤이나 컨트롤이 제스처를 끊지 않도록 `touchAction: 'none'`,
   `pointerEvents: 'auto'`, `userSelect: 'none'`을 inline style로 지정합니다.

controller는 하나의 제스처 세션을 소유하고 cancel 또는 complete 이후 update를 무시하므로
커스텀 Route에 Hero 전용 정리 코드를 둘 필요가 없습니다. `popGestureInProgress`는 현재
Navigator가 해당 화면의 인터랙티브 pop을 처리 중인지 알려줍니다. ScreenStack은 진행률을
내부적으로 제한합니다.
