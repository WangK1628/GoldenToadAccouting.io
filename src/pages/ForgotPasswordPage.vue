<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import { authService } from '@/services/auth.service'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()

const email = ref('')
const code = ref('')
const password = ref('')
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
    const result = await authService.sendVerificationCode(email.value, 'reset')
    toast.success(result.message)
    startCooldown()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '发送失败')
  }
}

async function submit() {
  if (loading.value) return
  loading.value = true
  try {
    await authService.resetPassword(email.value, code.value, password.value)
    toast.success('密码已重置，请登录')
    await router.replace('/login')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '重置失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="forgot-page">
    <PageHeader title="忘记密码" />

    <form class="form" @submit.prevent="submit">
      <label>
        <span>邮箱</span>
        <input v-model="email" type="email" placeholder="you@example.com" />
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
        <span>新密码</span>
        <input v-model="password" type="password" placeholder="至少 6 位" />
      </label>
      <button type="submit" class="primary" :disabled="loading">
        {{ loading ? '提交中…' : '重置密码' }}
      </button>
    </form>

    <button type="button" class="link" @click="router.push('/login')">返回登录</button>
  </div>
</template>

<style scoped>
.forgot-page {
  padding-bottom: 1rem;
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
  cursor: pointer;
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
