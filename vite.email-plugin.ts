import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  handleAiTrial,
  handleConsumeTrial,
  handleSendCode,
  handleVerifyCode,
} from './api/_lib/handlers'
import type { ApiResult } from './api/_lib/types'

type Handler = (
  env: Record<string, string>,
  body: Record<string, unknown>,
  headers: { email: string; userId: string },
) => Promise<ApiResult>

const ROUTES: Record<string, Handler> = {
  '/api/send-code': (env, body) => handleSendCode(env, body),
  '/api/verify-code': (env, body) => handleVerifyCode(env, body),
  '/api/ai-trial': (env, body, headers) => handleAiTrial(env, body, headers.email, headers.userId),
  '/api/consume-trial': (env, body, headers) => handleConsumeTrial(env, body, headers.userId),
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function emailDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'golden-toad-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        const handler = ROUTES[url]
        if (!handler) {
          next()
          return
        }

        const httpRes = res as ServerResponse
        if (req.method === 'OPTIONS') {
          httpRes.statusCode = 204
          httpRes.end()
          return
        }
        if (req.method !== 'POST') {
          next()
          return
        }

        try {
          const raw = await readBody(req)
          const payload = JSON.parse(raw || '{}') as Record<string, unknown>
          const emailHeader = String(req.headers['x-user-email'] ?? '')
          const userIdHeader = String(req.headers['x-user-id'] ?? '')
          const result = await handler(env, payload, { email: emailHeader, userId: userIdHeader })
          httpRes.statusCode = result.status
          httpRes.setHeader('Content-Type', 'application/json; charset=utf-8')
          httpRes.end(JSON.stringify(result.json))
        } catch (error) {
          httpRes.statusCode = 500
          httpRes.setHeader('Content-Type', 'application/json; charset=utf-8')
          httpRes.end(
            JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : '服务失败',
            }),
          )
        }
      })
    },
  }
}
