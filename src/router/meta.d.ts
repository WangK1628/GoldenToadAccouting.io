import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    actionBar?: boolean
    actionBarVariant?: 'home' | 'chat'
    layout?: 'blank'
    public?: boolean
  }
}
