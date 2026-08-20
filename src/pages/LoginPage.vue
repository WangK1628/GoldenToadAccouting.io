<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { APP, AUTHOR } from '@/constants/author'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'

type LoginTab = 'code' | 'password'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const tab = ref<LoginTab>('code')
const email = ref('')
const code = ref('')
const password = ref('')
const loading = ref(false)
const codeCooldown = ref(0)
const lastCode = ref('')

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
    const generated = authService.requestVerificationCode(email.value)
    lastCode.value = generated
    code.value = generated
    toast.success(`验证码已填入：${generated}`)
    startCooldown()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '发送失败')
  }
}

async function submit() {
  if (loading.value) return
  loading.value = true
  try {
    if (tab.value === 'code') {
      await authStore.loginCode(email.value, code.value)
    } else {
      await authStore.loginPassword(email.value, password.value)
    }
    toast.success('登录成功')
    await router.replace('/')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '登录失败')
  } finally {
    loading.value = false
  }
}

async function skipLogin() {
  await authStore.enterGuest()
  toast.success('已进入游客模式，数据保存在本地')
  await router.replace('/')
}
</script>

<template>
  <div class="login-page">
    <header class="brand">
      <img src="/favicon.svg" alt="" width="56" height="56" class="logo" />
      <h1>{{ APP.name }}</h1>
      <p class="slogan">{{ APP.slogan }}</p>
      <p class="features">{{ APP.tagline }}</p>
    </header>

    <section class="card">
      <h2>登录</h2>

      <div class="tabs">
        <button type="button" :class="{ active: tab === 'code' }" @click="tab = 'code'">
          验证码登录
        </button>
        <button type="button" :class="{ active: tab === 'password' }" @click="tab = 'password'">
          密码登录
        </button>
      </div>

      <form class="form" @submit.prevent="submit">
        <label>
          <span>邮箱</span>
          <input v-model="email" type="email" placeholder="you@example.com" autocomplete="email" />
        </label>

        <label v-if="tab === 'code'">
          <span>验证码</span>
          <div class="code-row">
            <input v-model="code" type="text" inputmode="numeric" maxlength="6" placeholder="6 位验证码" />
            <button type="button" class="code-btn" :disabled="codeCooldown > 0" @click="sendCode">
              {{ codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
            </button>
          </div>
        </label>

        <label v-else>
          <span>密码</span>
          <input
            v-model="password"
            type="password"
            placeholder="至少 6 位"
            autocomplete="current-password"
          />
        </label>

        <p class="hint">
          未注册将自动注册。本地版无邮件服务，验证码会直接填入输入框。
        </p>
        <p v-if="lastCode" class="code-hint">本次验证码：{{ lastCode }}</p>

        <button type="submit" class="primary" :disabled="loading">
          {{ loading ? '登录中…' : '登录 / 注册' }}
        </button>
      </form>

      <div class="links">
        <button type="button" @click="router.push('/register')">注册账号</button>
        <button type="button" @click="router.push('/forgot-password')">忘记密码</button>
      </div>

      <button type="button" class="skip" @click="skipLogin">稍后再说</button>
    </section>

    <footer class="footer">
      <a :href="AUTHOR.github" target="_blank" rel="noopener">@{{ AUTHOR.name }}</a>
    </footer>
  </div>
</template>

<style scoped>
.login-page {
  min-height: var(--app-height);
  padding: calc(1.25rem + var(--safe-top)) 1rem calc(1.5rem + var(--safe-bottom));
  background:
    radial-gradient(ellipse 120% 60% at 50% -10%, var(--accent-soft) 0%, transparent 55%),
    linear-gradient(180deg, var(--bg1) 0%, var(--bg0) 100%);
}

.brand {
  text-align: center;
  margin-bottom: 1.25rem;
}

.logo {
  border-radius: 14px;
  filter: drop-shadow(0 4px 10px rgba(168, 132, 26, 0.18));
}

.brand h1 {
  margin: 0.65rem 0 0;
  font-size: 1.35rem;
  color: var(--brand-deep);
}

.slogan {
  margin: 0.35rem 0 0;
  font-size: 0.88rem;
  color: var(--muted);
}

.features {
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  color: var(--muted-2);
}

.card {
  max-width: var(--app-max);
  margin: 0 auto;
  padding: 1.1rem 1rem 1rem;
  border-radius: 18px;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 8px 28px #2c241610;
}

.card h2 {
  margin: 0 0 0.85rem;
  text-align: center;
  font-size: 1.05rem;
  color: var(--brand-deep);
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  padding: 0.25rem;
  border-radius: 12px;
  background: var(--cream);
}

.tabs button {
  border: none;
  border-radius: 10px;
  padding: 0.55rem;
  background: transparent;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
}

.tabs button.active {
  background: var(--panel);
  color: var(--brand-deep);
  font-weight: 600;
  box-shadow: 0 1px 4px #2c241610;
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
  background: var(--cream);
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
  margin: 0 0 0.45rem;
  font-size: 0.72rem;
  color: var(--muted-2);
  line-height: 1.45;
}

.code-hint {
  margin: 0 0 0.85rem;
  font-size: 0.82rem;
  color: var(--brand-deep);
  font-weight: 600;
}

.primary {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 0.82rem;
  background: linear-gradient(180deg, var(--gold) 0%, var(--brand-deep) 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.65;
}

.links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.85rem;
}

.links button,
.skip {
  border: none;
  background: transparent;
  color: var(--brand);
  font-size: 0.82rem;
  cursor: pointer;
}

.skip {
  display: block;
  width: 100%;
  margin-top: 0.65rem;
  color: var(--muted);
}

.footer {
  margin-top: 1.25rem;
  text-align: center;
  font-size: 0.78rem;
}

.footer a {
  color: var(--muted);
  text-decoration: none;
}
</style>
