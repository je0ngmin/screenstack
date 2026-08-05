# API

## `StackNavigator`

내비게이션 Context를 생성하고 화면을 스택으로 렌더링합니다.

모든 내비게이션 흐름에는 `StackNavigator`가 필요합니다. 독립적인 스택이 필요하면 여러
내비게이터를 렌더링할 수 있고, 지역적인 흐름이 필요하면 내비게이터를 중첩할 수도 있습니다.
중첩된 경우 `useStackNavigation()`은 가장 가까운 `StackNavigator`의 API를 반환합니다.

| Prop | 타입 | 설명 |
| --- | --- | --- |
| `children` | `ReactNode` | 초기 화면 콘텐츠입니다. |
| `initialScreen` | `ReactNode` | 명시적인 초기 콘텐츠입니다. 지정하면 `children`보다 우선합니다. |
| `className` | `string` | 사용자 스타일을 위한 선택적 class 이름입니다. |
| `ref` | `Ref<StackNavigation>` | 외부 제어를 위한 선택적 내비게이션 ref입니다. |

## `Hero`

`push`와 `pop` 중 공유 요소 전환에 사용할 요소를 표시합니다.

```ts
interface HeroProps {
  id: string
  children: ReactElement
  transitionOnUserGestures?: boolean
}
```

서로 인접한 화면에서 `id`가 같은 Hero는 위치와 크기가 자연스럽게 이어지도록
전환됩니다. 텍스트 콘텐츠는 두 Hero를 겹쳐 교차 페이드합니다. 두 Hero는 동일한
최인접 `StackNavigator`에 속해야 하며, 한 화면에서는 Hero ID를 한 번만 사용해야 합니다.

`transitionOnUserGestures`의 기본값은 `true`입니다. 특정 Hero를 인터랙티브 pop
제스처에서 제외하려면 `false`로 설정하세요. 서로 매칭되는 두 Hero가 모두 이 옵션을
활성화해야 제스처 전환에 참여합니다.

## `usePageRouteTransition()`

가장 가까운 `StackNavigator` 화면의 라우트 전환 컨트롤러를 반환합니다. 사용자 정의
페이지 라우트는 내장 라우트 컴포넌트에 의존하지 않고 이 컨트롤러로 인터랙티브 Hero
전환을 구동할 수 있습니다.

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

`beginPopGesture()`는 제스처를 시작할 수 없으면 `null`을 반환합니다. 반환된 controller는
해당 제스처와 Hero 이동을 함께 소유합니다. progress는 `0`부터 `1` 사이로 제한됩니다.
사용자 정의 Route의 마무리 duration을 전달해 `cancel()` 또는 `complete()`로 정확히 한 번
종료하세요.

드래그 중 progress는 그대로 적용되어 Hero가 손가락을 따라갑니다. 손을 놓은 뒤
`cancel()`과 `complete()`는 등록된 pop `curve`를 사용합니다.
`createCubicBezierCurve(x1, y1, x2, y2)`를 사용하면 Route의 inline
`cubic-bezier(...)` easing과 동일한 progress 함수를 만들 수 있습니다.

기존 네 개 함수로 구성된 pop 제스처 API는 호환성을 위해 유지되지만 deprecated 처리됩니다.

`registerTransition()`은 layout effect에서 호출하고 반환되는 정리 함수를 그대로
반환하세요. 그러면 일반 push와 pop의 Hero 전환이 사용자 정의 라우트의 inline
transition duration 및 easing과 동기화됩니다. 등록된 pop duration은 종료 화면을
스택에서 제거하는 시점에도 사용됩니다. `registerHeroTransition()`은 호환성을 위한
deprecated alias로 유지됩니다.

## `useStackNavigation()`

현재 화면의 `StackNavigationState` 객체를 반환합니다. 반드시 `StackNavigator` 아래에서 호출해야 합니다.

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

`canGoBack`은 훅을 호출한 화면을 기준으로 합니다. 따라서 루트 화면의 값은 다른 화면을
push한 후에도 `false`로 유지됩니다. `isActive`는 해당 화면이 가장 가까운 Navigator의
맨 위에 있을 때만 `true`이며, 그 위에 다른 화면이 push되면 `false`로 변경됩니다.

### `push`

스택 맨 위에 새로운 화면을 추가합니다.

### `pop`

종료 전환 효과가 끝난 후 현재 화면을 제거합니다. 루트 화면에서는 아무 작업도 하지 않습니다.

### `replace`

현재 화면을 새로운 화면으로 교체합니다.

### `reset`

현재 스택을 제거하고 새로운 루트 화면으로 초기화합니다.

## `useStackNavigationRef()`

내비게이션 Context 외부에서 `StackNavigator`를 제어할 ref를 생성합니다.

```tsx
const navigationRef = useStackNavigationRef()

navigationRef.current?.push(<PageRoute>...</PageRoute>)

<StackNavigator ref={navigationRef}>...</StackNavigator>
```

Navigator가 mount되기 전과 unmount된 후에는 `current`가 `null`입니다. 독립적이거나
중첩된 Navigator마다 별도의 ref를 생성하세요. ref는 특정 화면에 속하지 않으므로
내비게이션 함수와 Navigator 기준 `canGoBack`을 제공하지만, 훅 전용 화면 상태인
`isActive`는 제공하지 않습니다.

## 라우트 컴포넌트

### `PageRoute`

```ts
interface PageRouteProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}
```

### `MaterialPageRoute`

`PageRouteProps`를 지원합니다.

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

`sourceRef`는 화면이 확대되기 시작하고 다시 축소되어 돌아갈 요소를 지정합니다. 참조하는
요소는 이전 화면에 mount된 상태로 남아 있어야 합니다. `transitionDuration`의 기본값은
`600`ms이며 일반 push 및 pop Hero 이동 시간도 함께 동기화합니다.

### `AdaptivePageRoute`

```ts
type PageRoutePlatform = 'ios' | 'android'

interface AdaptivePageRouteProps extends CupertinoPageRouteProps {
  platform?: PageRoutePlatform
}
```
