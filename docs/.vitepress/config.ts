import { defineConfig } from 'vitepress'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isUserPagesRepository = repositoryName?.endsWith('.github.io')
const base =
  process.env.GITHUB_ACTIONS === 'true' &&
  repositoryName &&
  !isUserPagesRepository
    ? `/${repositoryName}/`
    : '/'

export default defineConfig({
  base,
  cleanUrls: true,
  lastUpdated: true,
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'ScreenStack',
      description: 'App-style screen navigation for the web.',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'API', link: '/api' },
          { text: 'Examples', link: '/examples' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Page Routes', link: '/guide/page-routes' },
              { text: 'Hero Transitions', link: '/guide/hero' },
              { text: 'Cupertino Swipe Back', link: '/guide/cupertino-swipe' },
            ],
          },
          {
            text: 'Reference',
            items: [
              { text: 'API', link: '/api' },
              { text: 'Examples', link: '/examples' },
            ],
          },
        ],
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'ScreenStack',
        },
      },
    },
    ko: {
      label: '한국어',
      lang: 'ko-KR',
      link: '/ko/',
      title: 'ScreenStack',
      description: '웹을 위한 앱 스타일 화면 내비게이션.',
      themeConfig: {
        nav: [
          { text: '홈', link: '/ko/' },
          { text: '가이드', link: '/ko/guide/getting-started' },
          { text: 'API', link: '/ko/api' },
          { text: '예제', link: '/ko/examples' },
        ],
        sidebar: [
          {
            text: '가이드',
            items: [
              { text: '시작하기', link: '/ko/guide/getting-started' },
              { text: '페이지 라우트', link: '/ko/guide/page-routes' },
              { text: 'Hero 전환', link: '/ko/guide/hero' },
              {
                text: 'Cupertino 스와이프 뒤로 가기',
                link: '/ko/guide/cupertino-swipe',
              },
            ],
          },
          {
            text: '참조',
            items: [
              { text: 'API', link: '/ko/api' },
              { text: '예제', link: '/ko/examples' },
            ],
          },
        ],
        footer: {
          message: 'MIT 라이선스로 배포됩니다.',
          copyright: 'ScreenStack',
        },
        lastUpdated: {
          text: '마지막 업데이트',
        },
        docFooter: {
          prev: '이전 페이지',
          next: '다음 페이지',
        },
        outlineTitle: '페이지 목차',
        returnToTopLabel: '맨 위로 돌아가기',
        sidebarMenuLabel: '메뉴',
        darkModeSwitchLabel: '테마',
      },
    },
  },
  themeConfig: {
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
    },
  },
})
