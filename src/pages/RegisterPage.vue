<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const email = ref('')
const code = ref('')
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const codeCooldown = ref(0)

let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown(seconds = 60) {
  codeCooldown.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    codeCooldown.value -= 1
    if (codeCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

async function sendCode() {
  if (codeCooldown.value > 0) return
  try {
    const result = await authService.sendVerificationCode(email.value, 'register')
    toast.success(result.message)
    startCooldown()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '发送失败')
  }
}

async function submit() {
  if (loading.value) return
  if (password.value !== confirm.value) {
    toast.error('两次密码不一致')
    return
  }
  loading.value = true
  try {
    await authStore.register(email.value, password.value, code.value)
    toast.success('注册成功，可免费体验一次 AI')
    await router.replace('/')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <PageHeader title="注册账号" />

    <form class="form" @submit.prevent="submit">
      <label>
        <span>邮箱</span>
        <input v-model="email" type="email" placeholder="you@example.com" autocomplete="email" />
      </label>
      <label>
        <span>验证码</span>
        <div class="code-row">
          <input v-model="code" type="text" inputmode="numeric" maxlength="6" placeholder="6 位验证码" />
          <button type="button" class="code-btn" :disabled="codeCooldown > 0" @click="sendCode">
            {{ codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
          </button>
        </div>
      </label>
      <label>
        <span>密码</span>
        <input v-model="password" type="password" placeholder="至少 6 位" autocomplete="new-password" />
      </label>
      <label>
        <span>确认密码</span>
        <input v-model="confirm" type="password" placeholder="再次输入密码" autocomplete="new-password" />
      </label>
      <button type="submit" class="primary" :disabled="loading">
        {{ loading ? '注册中…' : '注册' }}
      </button>
    </form>

    <button type="button" class="link" @click="router.push('/login')">已有账号？去登录</button>
  </div>
</template>

<style scoped>
.register-page {
  padding-bottom: 1rem;
}

.form {
  padding: 0 0.15rem;
}

.form label {
  display: block;
  margin-bottom: 0.75rem;
}

.form label span {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.78rem;
  color: var(--muted);
}

.form input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.72rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink);
  font-size: 0.92rem;
}

.code-row {
  display: flex;
  gap: 0.45rem;
}

.code-row input {
  flex: 1;
}

.code-btn {
  flex-shrink: 0;
  border: none;
  border-radius: 12px;
  padding: 0 0.75rem;
  background: var(--accent-soft);
  color: var(--brand-deep);
  font-size: 0.78rem;
  white-space: nowrap;
  cursor: pointer;
}

.code-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.hint {
  margin: 0 0 0.85rem;
  font-size: 0.72rem;
  color: var(--muted-2);
  line-height: 1.45;
}

.primary {
  width: 100%;
  margin-top: 0.35rem;
  border: none;
  border-radius: 999px;
  padding: 0.82rem;
  background: linear-gradient(180deg, var(--gold) 0%, var(--brand-deep) 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.link {
  display: block;
  width: 100%;
  margin-top: 0.85rem;
  border: none;
  background: transparent;
  color: var(--brand);
  font-size: 0.85rem;
  cursor: pointer;
}
</style>
