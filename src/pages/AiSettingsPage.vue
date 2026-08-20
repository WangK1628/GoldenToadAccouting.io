<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { aiService } from '@/services'
import type { AiProviderType, AiSettings } from '@/models'
import { AI_TRIAL_MAX_MESSAGES } from '@/models'

const router = useRouter()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const trialExhausted = ref(false)
const hasOwnKey = ref(false)
const form = ref<AiSettings>({
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.2,
})

const providerOptions: Array<{ value: AiProviderType; label: string; baseUrl: string; model: string }> =
  [
    {
      value: 'deepseek',
      label: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
    },
    {
      value: 'openai-compatible',
      label: 'OpenAI 兼容',
      baseUrl: 'https://api.openai.com',
      model: 'gpt-4o-mini',
    },
  ]

onMounted(async () => {
  form.value = await aiService.loadSettings()
  hasOwnKey.value = Boolean(form.value.apiKey.trim())
  trialExhausted.value = await aiService.isTrialExhausted()
  loading.value = false
})

function onProviderChange() {
  const preset = providerOptions.find((p) => p.value === form.value.provider)
  if (preset && form.value.provider !== 'custom') {
    form.value.baseUrl = preset.baseUrl
    if (!form.value.model || form.value.model === 'deepseek-chat' || form.value.model === 'gpt-4o-mini') {
      form.value.model = preset.model
    }
  }
}

async function save() {
  if (!form.value.apiKey.trim() && trialExhausted.value) {
    toast.error(`免费体验已用完（${AI_TRIAL_MAX_MESSAGES} 次），请填写 DeepSeek API Key`)
    return
  }
  saving.value = true
  try {
    await aiService.saveSettings({ ...form.value })
    hasOwnKey.value = Boolean(form.value.apiKey.trim())
    trialExhausted.value = await aiService.isTrialExhausted()
    toast.success('AI 设置已保存')
    if (hasOwnKey.value) {
      router.push('/chat')
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function goChat() {
  router.push('/chat')
}
</script>

<template>
  <div class="ai-settings-page">
    <PageHeader title="AI 设置" />

    <p v-if="trialExhausted && !form.apiKey" class="notice required">
      免费体验已用完（{{ AI_TRIAL_MAX_MESSAGES }} 次）。请填写 DeepSeek API Key 后才能继续使用 AI 助手。
    </p>

    <section v-if="loading" class="loading">加载中…</section>

    <form v-else class="form" @submit.prevent="save">
      <label>
        Provider
        <select v-model="form.provider" @change="onProviderChange">
          <option v-for="opt in providerOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
          <option value="custom">自定义</option>
        </select>
      </label>

      <label>
        Base URL
        <input v-model="form.baseUrl" type="url" required placeholder="https://api.deepseek.com" />
      </label>

      <label>
        API Key
        <input
          v-model="form.apiKey"
          type="password"
          autocomplete="off"
          :required="trialExhausted && !hasOwnKey"
          placeholder="sk-..."
        />
        <span class="hint">密钥只保存在这台设备上。</span>
      </label>

      <label>
        Model
        <input v-model="form.model" type="text" required placeholder="deepseek-chat" />
      </label>

      <label>
        Temperature
        <input
          v-model.number="form.temperature"
          type="number"
          min="0"
          max="2"
          step="0.1"
        />
      </label>

      <div class="actions">
        <button type="submit" class="primary-btn" :disabled="saving">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <button type="button" class="ghost-btn" @click="goChat">去对话</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  color: var(--muted);
  padding: 2rem 0;
}

.notice.required {
  margin: 0 0 0.85rem;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  background: #fdecea;
  color: #a33232;
  font-size: 0.82rem;
  line-height: 1.45;
  border: 1px solid #f0c4c4;
}

.form {
  display: grid;
  gap: 0.85rem;
}

label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--muted);
}

input,
select {
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink);
  font-size: 0.9rem;
}

.hint {
  font-size: 0.72rem;
  color: var(--muted-2);
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.primary-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 12px;
  background: var(--brand);
  color: #fff;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.ghost-btn {
  padding: 0.75rem 1rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: transparent;
  color: var(--muted);
  font-size: 0.88rem;
  cursor: pointer;
}
</style>
