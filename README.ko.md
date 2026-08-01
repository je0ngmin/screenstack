# ScreenStack

[English](./README.md) | [한국어](./README.ko.md)

**웹을 위한 앱 스타일 화면 내비게이션.**

ScreenStack은 React 애플리케이션을 위한 가볍고 타입 안전한 화면 스택 라이브러리입니다.

## StackNavigator

모든 내비게이션 API는 반드시 `StackNavigator` 안에서 사용해야 합니다.
`useStackNavigation()`은 호출한 컴포넌트에서 가장 가까운 상위 `StackNavigator`의
내비게이션 객체를 반환합니다.

하나의 애플리케이션에서 여러 `StackNavigator`를 렌더링할 수 있으며 각 내비게이터는 독립적인
화면 스택을 관리합니다. 내비게이터를 서로 중첩할 수도 있으며, 중첩된 내비게이터의 하위
컴포넌트는 가장 가까운 내부 스택을 제어합니다.

Navigator Context 외부에서 스택을 제어하려면 `useStackNavigationRef()`로 만든 ref를
연결하세요.

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
        열기
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

## 설치

```bash
npm i screenstack
yarn add screenstack
pnpm i screenstack
```

## 사용법

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

`MaterialPageRoute` 또는 `CupertinoPageRoute`를 사용하면 페이지 전환 방식을 직접 선택할 수 있습니다.
`AdaptivePageRoute`는 iOS에서 Cupertino 전환을 사용하고 Android와 그 외 플랫폼에서는 Material Design을 이용한 `MaterialPageRoute`를 사용합니다. `CupertinoPageRoute`는 화면 왼쪽 가장자리에서 시작하는 인터랙티브 뒤로 가기 제스처도 지원합니다.

`CupertinoZoomTransitionPageRoute`는 ref로 지정한 요소에서 화면을 확대하고 pop할 때 같은
요소로 되돌립니다. iOS 18에서 도입된 zoom 전환에서 영감을 받은 인터랙티브 스와이프 뒤로
가기 제스처도 제공합니다.

## Hero 전환

이전 화면과 새로 push할 화면에서 서로 이어질 요소를 같은 ID의 `Hero`로 감싸세요.

```tsx
<Hero id="profile-avatar">
  <img src="/avatar.jpg" alt="" />
</Hero>
```

ID가 같은 Hero는 `push`와 `pop` 중 위치와 크기가 자연스럽게 이어지도록 전환됩니다.
텍스트가 포함된 Hero는 이전 콘텐츠와 새 콘텐츠를 겹쳐 교차 페이드합니다. 두 Hero는
동일한 최인접 `StackNavigator`에 속해야 하며, 한 화면에서 각 ID는 고유해야 합니다.
