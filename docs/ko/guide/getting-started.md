# 시작하기

ScreenStack은 React에서 사용할 수 있는 스택 내비게이터와 페이지 라우트 컴포넌트를
제공합니다.

## 설치

```bash
pnpm add screenstack
```

React와 React DOM은 peer dependency입니다. React 18 이상을 지원합니다.

::: warning StackNavigator는 필수입니다
내비게이션은 반드시 `StackNavigator` 안에서 사용해야 합니다. `useStackNavigation()` 훅은
호출한 컴포넌트에서 가장 가까운 상위 `StackNavigator`를 사용합니다.
:::

## 내비게이터 만들기

높이가 지정된 컨테이너 안에 `StackNavigator`를 렌더링하세요. 각 라우트 화면은 컨테이너를
채우도록 배치됩니다.

```tsx
import {
  AdaptivePageRoute,
  StackNavigator,
  useStackNavigation,
} from 'screenstack'

function DetailsPage() {
  const navigation = useStackNavigation()

  return <button onClick={navigation.pop}>뒤로 가기</button>
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
      상세 페이지 열기
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

라이브러리 CSS를 별도로 import할 필요가 없습니다. 내비게이션 레이아웃과 화면 전환은 React
인라인 스타일로 구현되어 있습니다.

## 여러 내비게이터와 중첩

하나의 애플리케이션에서 여러 `StackNavigator`를 렌더링할 수 있습니다. 각 내비게이터는 서로
독립적인 화면 스택과 내비게이션 기록을 관리합니다.

내비게이터를 서로 중첩할 수도 있습니다.

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

`LocalFlowPage`에서 호출한 `useStackNavigation()`은 가장 가까운 내부 `StackNavigator`를
제어합니다. 내부 내비게이터 밖의 컴포넌트는 계속 외부 스택을 사용합니다.

## Workspace 예제 실행

이 저장소의 `examples/basic`에 Vite React 예제 앱이 있습니다.

```bash
pnpm dev
```
