import { useRef } from 'react'
import {
  AdaptivePageRoute,
  CupertinoPageRoute,
  CupertinoZoomTransitionPageRoute,
  Hero,
  MaterialPageRoute,
  StackNavigator,
  useStackNavigation,
} from 'screenstack'
import './App.css'

function Details({ title }: { title: string }) {
  const navigation = useStackNavigation()

  return (
    <main className="page details-page">
      <Hero id="eyebrow1">
      <span className="eyebrow">Page route</span>
      </Hero>
      <Hero id="route-icon1">
        <div className="route-icon route-icon-large">R</div>
      </Hero>
      <Hero id="title1">
      <h1>{title}</h1>
      </Hero>
      <p>Use the back button or swipe right from the left edge.</p>
      <button onClick={navigation.pop}>Back</button>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
      ㅇㄴㅇㄴㅁㅁㅇㄴㅁㅇㅁㄴ<br/>
    </main>
  )
}

function Home() {
  const navigation = useStackNavigation()
  const zoomSourceRef = useRef<HTMLButtonElement>(null)

  return (
    <main className="page home-page">
      <Hero id="eyebrow">
      <span className="eyebrow">Example</span>
      </Hero>
      <Hero id="route-icon">
        <div className="route-icon">R</div>
      </Hero>
      <Hero id="title">
      <h1>Stack navigation</h1>
      </Hero>
      <p>Open each route to compare its transition.</p>
      <div className="actions">
        <button
          ref={zoomSourceRef}
          data-testid="open-cupertino-zoom"
          onClick={() =>
            navigation.push(
              <CupertinoZoomTransitionPageRoute sourceRef={zoomSourceRef}>
                <Details title="Cupertino zoom route" />
              </CupertinoZoomTransitionPageRoute>,
            )
          }
        >
          Open Cupertino Zoom
        </button>
        <button
          data-testid="open-cupertino"
          onClick={() =>
            navigation.push(
              <CupertinoPageRoute>
                <Details title="Cupertino route" />
              </CupertinoPageRoute>,
            )
          }
        >
          Open Cupertino
        </button>
        <button
          onClick={() =>
            navigation.push(
              <MaterialPageRoute>
                <Details title="Material route" />
              </MaterialPageRoute>,
            )
          }
        >
          Open Material
        </button>
        <button
          onClick={() =>
            navigation.push(
              <AdaptivePageRoute>
                <Details title="Adaptive route" />
              </AdaptivePageRoute>,
            )
          }
        >
          Open Adaptive
        </button>
      </div>
    </main>
  )
}

function App() {
  return (
    <div className="device">
      <StackNavigator>
        <Home />
      </StackNavigator>
    </div>
  )
}

export default App
