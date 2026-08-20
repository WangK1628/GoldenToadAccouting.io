import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SETTING_KEYS } from '@/models'
import { settingsRepository } from '@/repositories'

export type GuideAction = 'click' | 'hold'

export interface GuideStep {
  id: string
  target: string
  title: string
  body: string
  hint: string
  action: GuideAction
  route?: string
  placement?: 'top' | 'bottom'
}

const STEPS: GuideStep[] = [
  {
    id: 'weekdays',
    target: '[data-guide="weekdays"]',
    title: '切换日期',
    body: '这里是一周的快捷切换栏，只显示本周一到今天。',
    hint: '请点击高亮的某一天',
    action: 'click',
    route: '/',
    placement: 'bottom',
  },
  {
    id: 'record',
    target: '[data-guide="record-btn"]',
    title: '手动记一笔',
    body: '左下角金色 + 号，点一下就会弹出记账面板。',
    hint: '请点击左下角 + 按钮',
    action: 'click',
    route: '/',
    placement: 'top',
  },
  {
    id: 'voice',
    target: '[data-guide="voice-pill"]',
    title: '语音记账',
    body: '按住中间输入条说话，松手后自动识别成文字；上滑可取消。',
    hint: '请按住高亮区域说话，松手继续',
    action: 'hold',
    route: '/',
    placement: 'top',
  },
  {
    id: 'chat',
    target: '[data-guide="chat-btn"]',
    title: '问金蝉',
    body: '右侧金蝉头像进入 AI 对话，可以问花销、让它帮你记账。',
    hint: '请点击右侧金蝉头像',
    action: 'click',
    route: '/',
    placement: 'top',
  },
  {
    id: 'settings',
    target: '[data-guide="settings-btn"]',
    title: '设置入口',
    body: '右上角可以进设置：换账本、填 AI Key、导入导出、检查更新。',
    hint: '请点击右上角设置',
    action: 'click',
    route: '/',
    placement: 'bottom',
  },
]

export const useGuideStore = defineStore('guide', () => {
  const active = ref(false)
  const stepIndex = ref(0)
  const nudge = ref(false)

  const steps = STEPS
  const currentStep = computed(() => steps[stepIndex.value] ?? null)
  const isLast = computed(() => stepIndex.value >= steps.length - 1)

  async function load() {
    const done = await settingsRepository.get(SETTING_KEYS.featureGuideDone)
    if (done !== '1') active.value = true
  }

  async function finish() {
    active.value = false
    await settingsRepository.set(SETTING_KEYS.featureGuideDone, '1')
  }

  function skip() {
    void finish()
  }

  function advance() {
    nudge.value = false
    if (isLast.value) {
      void finish()
      return
    }
    stepIndex.value += 1
  }

  function bumpNudge() {
    nudge.value = true
    window.setTimeout(() => {
      nudge.value = false
    }, 520)
  }

  function notify(stepId: string) {
    if (!active.value || currentStep.value?.id !== stepId) return
    advance()
  }

  return {
    active,
    stepIndex,
    nudge,
    steps,
    currentStep,
    isLast,
    load,
    finish,
    skip,
    advance,
    bumpNudge,
    notify,
  }
})
