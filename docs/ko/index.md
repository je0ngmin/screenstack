---
layout: home

hero:
  name: ScreenStack
  text: 웹을 위한 앱 스타일 화면 내비게이션.
  tagline: Material, Cupertino 또는 적응형 전환으로 화면을 push하고 pop하세요.
  actions:
    - theme: brand
      text: 시작하기
      link: /ko/guide/getting-started
    - theme: alt
      text: API 보기
      link: /ko/api

features:
  - title: 라우트 컴포넌트
    details: Material, Cupertino, 적응형 또는 iOS 스타일 source zoom 페이지 라우트를 사용할 수 있습니다.
  - title: 인터랙티브 iOS 제스처
    details: 라우트 왼쪽 가장자리에서 스와이프하면 포인터 움직임에 맞춰 현재 페이지가 이동합니다.
  - title: 인라인 스타일
    details: 별도의 라이브러리 스타일시트 없이 내비게이션 레이아웃과 화면 전환을 제공합니다.
  - title: 조합 가능한 내비게이터
    details: 여러 StackNavigator로 독립적인 스택을 만들거나 중첩하여 지역적인 내비게이션 흐름을 구성할 수 있습니다.
---

## 화면 스택 내비게이션

```tsx
navigation.push(
  <AdaptivePageRoute>
    <DetailPage />
  </AdaptivePageRoute>,
)
```
