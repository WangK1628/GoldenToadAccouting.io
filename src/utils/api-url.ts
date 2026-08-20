/** 生产环境默认 API（Vercel Serverless）；开发环境走 Vite 本地中间件 */
const DEFAULT_API_BASE = 'https://golden-toad-accouting-io.vercel.app'

export function apiUrl(path: string): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  const base = configured || (import.meta.env.PROD ? DEFAULT_API_BASE : '')
  const clean = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${clean}` : clean
}
