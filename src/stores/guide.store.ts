import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { GUIDE_REWARD_POINTS, SETTING_KEYS } from '@/models'
import { settingsRepository } from '@/repositories'

export type GuideTour = 'intro' | 'ops'

export interface GuideStep {
  id: string
  /** CSS selector; omit for centered modal */
  target?: string
  title: string
  body: string
  route?: string
  placement?: 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
  /** Only shown to guest users */
  guestOnly?: boolean
  /** Force centered card without spotlight */
  center?: boolean
}

/** 第一轮：设置 / 登录 / 领积分 */
const INTRO_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    center: true,
    title: '欢迎使用金蝉记账',
    body: '本地优先的个人记账 App。先带你认识设置与登录入口，完成后还会有第二轮上手操作引导。',
    route: '/',
  },
  {
    id: 'settings',
    target: '[data-guide="menu-btn"]',
    title: '设置入口',
    body: '点击左上角菜单，选择「设置」可换账本、导入导出、配置 AI 等。浏览后返回首页继续。',
    route: '/',
    placement: 'bottom',
    align: 'start',
  },
  {
    id: 'login',
    target: '[data-guide="login-btn"]',
    title: '登录账号',
    body: '点击右上角「去登录」注册或登录。登录后可使用 AI 小助手，并完成引导领取积分。',
    route: '/',
    placement: 'bottom',
    align: 'end',
    guestOnly: true,
  },
  {
    id: 'ai-reward',
    center: true,
    title: '完成第一轮 · 领取积分',
    body: `点击「完成」领取 ${GUIDE_REWARD_POINTS} 积分，可体验约 3 次 AI 提问；用完后请在设置中填写自己的 DeepSeek API Key。`,
    route: '/',
  },
]

/** 第二轮：首页核心操作 */
const OPS_STEPS: GuideStep[] = [
  {
    id: 'ops-welcome',
    center: true,
    title: '上手操作引导',
    body: '接下来介绍首页常用操作：周切换、手动记一笔、语音输入和 AI 小助手。可随时点「下一步」继续。',
    route: '/',
  },
  {
    id: 'weekdays',
    target: '[data-guide="weekdays"]',
    title: '本周日期',
    body: '点击周一到周日，可切换查看对应日期的流水。',
    route: '/',
    placement: 'bottom',
    align: 'center',
  },
  {
    id: 'record',
    target: '[data-guide="record-btn"]',
    title: '手动记一笔',
    body: '点击左下角「+」打开记账面板，选择分类、金额后保存。可先试用，关闭面板后点「下一步」继续。',
    route: '/',
    placement: 'top',
    align: 'start',
  },
  {
    id: 'voice',
    target: '[data-guide="voice-pill"]',
    title: '文字 / 语音记录',
    body: '点击左侧麦克风切换语音模式，按住说话；再点一次回到文字输入。有积分或自配 API Key 后，AI 可帮你记一笔。',
    route: '/',
    placement: 'top',
    align: 'center',
  },
  {
    id: 'chat',
    target: '[data-guide="chat-btn"]',
    title: 'AI 小助手',
    body: '点击右下角金蝉图标进入对话。有积分或自配 API Key 后，可以说「午饭花了 32」让 AI 帮你记账。',
    route: '/',
    placement: 'top',
    align: 'end',
  },
  {
    id: 'settings',
    target: '[data-guide="menu-btn"]',
    title: '设置',
    body: '左上角菜单里可进入设置：账本、分类、AI 配置、数据导入导出等。',
    route: '/',
    placement: 'bottom',
    align: 'start',
  },
  {
    id: 'ops-done',
    center: true,
    title: '全部引导完成',
    body: '你已经了解主要操作。有积分时记得去 AI 小助手体验一次记一笔；也可以随时在设置里导入导出数据。',
    route: '/',
  },
]

export const useGuideStore = defineStore('guide', () => {
  const active = ref(false)
  const tour = ref<GuideTour>('intro')
  const stepIndex = ref(0)
  const activeSteps = ref<GuideStep[]>([...INTRO_STEPS])

  const currentStep = computed(() => activeSteps.value[stepIndex.value] ?? null)
  const isLast = computed(() => stepIndex.value >= activeSteps.value.length - 1)
  const totalSteps = computed(() => activeSteps.value.length)
  const tourLabel = computed(() => (tour.value === 'intro' ? '认识 App' : '上手操作'))

  function stepsFor(tourName: GuideTour, isGuest: boolean) {
    const source = tourName === 'intro' ? INTRO_STEPS : OPS_STEPS
    return source.filter((step) => !step.guestOnly || isGuest)
  }

  function initSteps(isGuest: boolean, tourName: GuideTour = tour.value) {
    tour.value = tourName
    activeSteps.value = stepsFor(tourName, isGuest)
    if (stepIndex.value >= activeSteps.value.length) {
      stepIndex.value = Math.max(0, activeSteps.value.length - 1)
    }
  }

  async function load(isGuest: boolean) {
    if (active.value) {
      initSteps(isGuest, tour.value)
      return
    }
    const introDone = await settingsRepository.get(SETTING_KEYS.featureGuideDone)
    const opsDone = await settingsRepository.get(SETTING_KEYS.featureGuideOpsDone)
    if (introDone !== '1') {
      initSteps(isGuest, 'intro')
      active.value = true
      return
    }
    if (opsDone !== '1') {
      initSteps(isGuest, 'ops')
      stepIndex.value = 0
      active.value = true
    }
  }

  function beginTour(isGuest: boolean, tourName: GuideTour = 'intro') {
    initSteps(isGuest, tourName)
    stepIndex.value = 0
    active.value = true
  }

  async function beginOpsTour(isGuest: boolean) {
    active.value = false
    await new Promise((resolve) => setTimeout(resolve, 400))
    initSteps(isGuest, 'ops')
    stepIndex.value = 0
    active.value = true
  }

  /** @returns rewarded + whether ops tour started */
  async function finishIntro(
    startOps: boolean,
    isGuest: boolean,
  ): Promise<{ rewarded: boolean; startedOps: boolean }> {
    const alreadyDone = await settingsRepository.get(SETTING_KEYS.featureGuideDone)
    await settingsRepository.set(SETTING_KEYS.featureGuideDone, '1')
    let rewarded = false
    if (alreadyDone !== '1') {
      await settingsRepository.grantGuideRewardPoints()
      rewarded = true
    }
    if (startOps) {
      const opsDone = await settingsRepository.get(SETTING_KEYS.featureGuideOpsDone)
      if (opsDone !== '1') {
        await beginOpsTour(isGuest)
        return { rewarded, startedOps: true }
      }
    }
    active.value = false
    return { rewarded, startedOps: false }
  }

  async function finishOps() {
    active.value = false
    await settingsRepository.set(SETTING_KEYS.featureGuideOpsDone, '1')
  }

  async function finish(isGuest: boolean): Promise<{ rewarded: boolean; startedOps: boolean }> {
    if (tour.value === 'intro') {
      return finishIntro(true, isGuest)
    }
    await finishOps()
    return { rewarded: false, startedOps: false }
  }

  async function skip(isGuest: boolean): Promise<{ rewarded: boolean }> {
    if (tour.value === 'intro') {
      // 跳过第一轮：仍发积分，并跳过第二轮
      const { rewarded } = await finishIntro(false, isGuest)
      await settingsRepository.set(SETTING_KEYS.featureGuideOpsDone, '1')
      active.value = false
      return { rewarded }
    }
    await finishOps()
    return { rewarded: false }
  }

  function advance() {
    if (isLast.value) return
    stepIndex.value += 1
  }

  function retreat() {
    if (stepIndex.value > 0) {
      stepIndex.value -= 1
      return
    }
    active.value = false
  }

  async function complete(isGuest: boolean) {
    return finish(isGuest)
  }

  /** After guest logs in during intro guide, jump to the reward step */
  function onGuestLoggedIn() {
    if (tour.value !== 'intro') return
    initSteps(false, 'intro')
    const idx = activeSteps.value.findIndex((s) => s.id === 'ai-reward')
    stepIndex.value = idx >= 0 ? idx : Math.max(0, activeSteps.value.length - 1)
  }

  const resyncTick = ref(0)

  function requestResync() {
    resyncTick.value += 1
  }

  return {
    active,
    tour,
    stepIndex,
    resyncTick,
    activeSteps,
    currentStep,
    isLast,
    totalSteps,
    tourLabel,
    load,
    beginTour,
    beginOpsTour,
    finish,
    skip,
    advance,
    retreat,
    complete,
    onGuestLoggedIn,
    initSteps,
    requestResync,
  }
})
