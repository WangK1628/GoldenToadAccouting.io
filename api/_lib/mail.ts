import type { ApiPurpose } from './types'

function titleFor(purpose: ApiPurpose): string {
  if (purpose === 'reset') return '重置密码验证码'
  if (purpose === 'register') return '注册验证码'
  return '登录验证码'
}

async function sendWithResend(
  env: Record<string, string>,
  email: string,
  code: string,
  title: string,
): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY
  if (!apiKey) return false
  const from = env.MAIL_FROM || '金蝉记账 <onboarding@resend.dev>'
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `金蝉记账 ${title}`,
      text: `您的${title}是 ${code}，5 分钟内有效。如非本人操作请忽略。`,
      html: `<!doctype html><html lang="zh-CN"><body style="margin:0;background:#fcf8ef;font-family:PingFang SC,Segoe UI,sans-serif;color:#4a3c31;">
  <div style="max-width:480px;margin:32px auto;padding:28px 24px;background:#fff;border-radius:20px;">
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#7a5c2d;">金蝉记账</p>
    <p style="margin:0 0 18px;font-size:14px;color:#9b8f7c;">${title}，5 分钟内有效。</p>
    <p style="margin:0;letter-spacing:8px;font-size:32px;font-weight:700;color:#4a3c31;">${code}</p>
    <p style="margin:18px 0 0;font-size:12px;color:#b3a48c;">如非本人操作，请忽略这封邮件。</p>
  </div>
</body></html>`,
    }),
  })
  if (!response.ok) {
    const detail = await response.text()
    console.error('[mail:resend]', detail)
    throw new Error('验证码发送失败，请稍后重试')
  }
  return true
}

async function sendWithFormSubmit(email: string, code: string, title: string): Promise<void> {
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: `金蝉记账 ${title}`,
      _template: 'box',
      _captcha: 'false',
      message: `您的${title}是 ${code}，5 分钟内有效。如非本人操作请忽略。`,
    }),
  })
  const payload = (await response.json().catch(() => null)) as { success?: string | boolean } | null
  const ok = payload?.success === true || payload?.success === 'true'
  if (!response.ok || !ok) {
    console.error('[mail:formsubmit]', payload)
    throw new Error('验证码发送失败，请稍后重试')
  }
}

export async function sendVerificationEmail(
  env: Record<string, string>,
  email: string,
  code: string,
  purpose: ApiPurpose,
): Promise<void> {
  const title = titleFor(purpose)
  const sent = await sendWithResend(env, email, code, title)
  if (sent) return
  await sendWithFormSubmit(email, code, title)
}
