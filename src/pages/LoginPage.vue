<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { APP, AUTHOR } from '@/constants/author'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import Mascot from '@/components/common/Mascot.vue'

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
    const result = await authService.sendVerificationCode(email.value, 'login')
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
      <Mascot :size="88" />
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
          <span>{{ tab === 'password' ? '账号' : '邮箱' }}</span>
          <input
            v-model="email"
            :type="tab === 'password' ? 'text' : 'email'"
            :placeholder="tab === 'password' ? '邮箱或管理员账号' : 'you@example.com'"
            autocomplete="username"
          />
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
            placeholder="密码"
            autocomplete="current-password"
          />
        </label>

        <button type="submit" class="primary" :disabled="loading">
          {{ loading ? '登录中…' : tab === 'password' ? '本地登录' : '验证并登录' }}
        </button>
      </form>

      <p v-if="tab === 'password'" class="hint">
        邮箱 + 密码保存在本机。首次输入会自动创建账号，无需验证码。
      </p>
      <p v-else class="hint">验证码会发到你的邮箱，页面不会显示验证码。</p>

      <div class="links">
        <button type="button" @click="router.push('/register')">注册账号</button>
        <button type="button" @click="router.push('/forgot-password')">忘记密码</button>
      </div>

      <button type="button" class="skip" @click="skipLogin">游客进入，功能可直接用</button>
    </section>

    <footer class="footer">
      <a :href="AUTHOR.github" target="_blank" rel="noopener">@{{ AUTHOR.name }}</a>
    </footer>
  </div>
</template>

<style scoped>
.login-page {
  min-height: var(--app-height);
  padding: calc(1.6rem + var(--safe-top)) 1.15rem calc(1.5rem + var(--safe-bottom));
  background:
    radial-gradient(ellipse 90% 42% at 50% -6%, var(--accent-soft) 0%, transparent 58%),
    var(--bg0);
}

.brand {
  text-align: center;
  margin-bottom: 1.5rem;
}

.brand :deep(.mascot) {
  margin: 0 auto;
}

.brand h1 {
  margin: 0.7rem 0 0;
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--brand-deep);
}

.slogan {
  margin: 0.4rem 0 0;
  font-size: 0.95rem;
  color: var(--muted);
}

.features {
  margin: 0.3rem 0 0;
  font-size: 0.75rem;
  color: var(--muted-2);
}

.card {
  max-width: var(--app-max);
  margin: 0 auto;
  padding: 1.25rem 1.05rem 1.1rem;
  border-radius: 24px;
  background: var(--panel);
  border: none;
  box-shadow: var(--shadow);
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
  margin: 0 0 0.85rem;
  font-size: 0.72rem;
  color: var(--muted-2);
  line-height: 1.45;
}

.primary {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 0.88rem;
  background: var(--brand);
  color: #fff;
  font-size: 0.96rem;
  font-weight: 650;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.65;
}

.hint {
  margin: 0.7rem 0 0;
  font-size: 0.72rem;
  color: var(--muted-2);
  line-height: 1.45;
  text-align: center;
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
  margin-top: 0.85rem;
  padding: 0.75rem;
  border: none;
  border-radius: 999px;
  background: var(--cream);
  color: var(--brand-deep);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
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
