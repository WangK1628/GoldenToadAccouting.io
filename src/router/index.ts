import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, saved) {
    return saved ?? { top: 0 }
  },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { title: '登录', layout: 'blank', public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/RegisterPage.vue'),
      meta: { title: '注册', layout: 'blank', public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/pages/ForgotPasswordPage.vue'),
      meta: { title: '忘记密码', layout: 'blank', public: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
      meta: { title: '首页', actionBar: true },
    },
    {
      path: '/records',
      name: 'records',
      component: () => import('@/pages/RecordsPage.vue'),
      meta: { title: '流水' },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/pages/ReportsPage.vue'),
      meta: { title: '统计' },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/pages/ChatPage.vue'),
      meta: { title: 'AI 记账', actionBar: false },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsPage.vue'),
      meta: { title: '设置' },
    },
    {
      path: '/settings/ai',
      name: 'settings-ai',
      component: () => import('@/pages/AiSettingsPage.vue'),
      meta: { title: 'AI 设置' },
    },
    {
      path: '/settings/data',
      name: 'settings-data',
      component: () => import('@/pages/DataPage.vue'),
      meta: { title: '数据管理' },
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('@/pages/CategoriesPage.vue'),
      meta: { title: '分类管理' },
    },
    {
      path: '/tags',
      name: 'tags',
      component: () => import('@/pages/TagsPage.vue'),
      meta: { title: '标签管理' },
    },
    {
      path: '/budget',
      name: 'budget',
      component: () => import('@/pages/BudgetPage.vue'),
      meta: { title: '预算' },
    },
    {
      path: '/ledgers',
      name: 'ledgers',
      component: () => import('@/pages/LedgersPage.vue'),
      meta: { title: '账本' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/pages/AboutPage.vue'),
      meta: { title: '关于' },
    },
    {
      path: '/release',
      name: 'release',
      component: () => import('@/pages/ReleasePage.vue'),
      meta: { title: '下载' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (!authStore.ready) {
    await authStore.load()
  }

  if (to.meta.public) return true

  if (!authStore.isAuthenticated()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  return true
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : '金蝉记账'
  document.title = title === '首页' ? '金蝉记账' : `${title} · 金蝉记账`
})

export default router
