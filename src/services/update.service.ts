import { Capacitor } from '@capacitor/core'
import { APP, AUTHOR } from '@/constants/author'

const OWNER_REPO = 'WangK1628/GoldenToadAccouting.io'
const APK_NAME = 'golden-toad-accounting.apk'

export function apkDownloadUrl(tag?: string): string {
  if (tag) {
    return `${AUTHOR.repo}/releases/download/${tag}/${APK_NAME}`
  }
  return `${AUTHOR.repo}/releases/latest/download/${APK_NAME}`
}

export function parseVersion(raw: string): number[] {
  return raw
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part.replace(/\D/g, ''), 10) || 0)
}

export function isNewerVersion(remote: string, local: string): boolean {
  const a = parseVersion(remote)
  const b = parseVersion(local)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    if (left > right) return true
    if (left < right) return false
  }
  return false
}

export interface LatestRelease {
  tag: string
  apkUrl: string
  newer: boolean
}

export async function fetchLatestRelease(): Promise<LatestRelease> {
  const response = await fetch(`https://api.github.com/repos/${OWNER_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) {
    return {
      tag: `v${APP.version}`,
      apkUrl: apkDownloadUrl(),
      newer: false,
    }
  }
  const json = (await response.json()) as { tag_name?: string }
  const tag = json.tag_name || `v${APP.version}`
  return {
    tag,
    apkUrl: apkDownloadUrl(tag),
    newer: isNewerVersion(tag, APP.version),
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('读取安装包失败'))
    reader.readAsDataURL(blob)
  })
}

function downloadInBrowser(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.rel = 'noopener'
  link.target = '_blank'
  link.download = APK_NAME
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export async function downloadAndInstallApk(url: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    downloadInBrowser(url)
    return
  }

  const response = await fetch(url)
  if (!response.ok) throw new Error('下载失败，请稍后重试')
  const blob = await response.blob()
  const data = await blobToBase64(blob)

  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  await Filesystem.writeFile({
    path: APK_NAME,
    data,
    directory: Directory.Cache,
  })
  const { uri } = await Filesystem.getUri({
    path: APK_NAME,
    directory: Directory.Cache,
  })

  try {
    const { FileOpener } = await import('@capacitor-community/file-opener')
    await FileOpener.open({
      filePath: uri,
      contentType: 'application/vnd.android.package-archive',
      openWithDefault: true,
    })
  } catch {
    window.open(url, '_blank')
  }
}
