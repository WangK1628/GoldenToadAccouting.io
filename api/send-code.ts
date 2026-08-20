import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleSendCode } from './_lib/handlers'

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Email')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
  const result = await handleSendCode(process.env as Record<string, string>, body)
  res.status(result.status).json(result.json)
}
