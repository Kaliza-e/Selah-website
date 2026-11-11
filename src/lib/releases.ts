export type DetectedOS = 'windows' | 'macos' | 'linux'

export interface ReleaseAssetInfo {
  name: string
  url: string
  sizeLabel: string
}

export interface ReleaseData {
  tagName: string
  publishedAt: string | null
  htmlUrl: string
  windows: ReleaseAssetInfo | null
  macos: ReleaseAssetInfo | null
  linux: ReleaseAssetInfo | null
}

const REPO_OWNER = 'Kaliza-e'
const REPO_NAME = 'Hello_118_24'
export const GITHUB_REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`

export function detectVisitorOS(): DetectedOS {
  if (typeof navigator === 'undefined') return 'windows'
  const ua = `${navigator.userAgent} ${navigator.platform}`.toLowerCase()
  if (ua.includes('mac')) return 'macos'
  if (ua.includes('linux') && !ua.includes('android')) return 'linux'
  return 'windows'
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

export async function fetchLatestRelease(signal?: AbortSignal): Promise<ReleaseData | null> {
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
  const res = await fetch(apiUrl, {
    signal,
    headers: { Accept: 'application/vnd.github+json' }
  })
  if (!res.ok) return null

  const json = await res.json()
  const assets: Array<{ name?: string; browser_download_url?: string; size?: number }> = Array.isArray(json.assets)
    ? json.assets
    : []

  const pickAsset = (predicates: RegExp[]): ReleaseAssetInfo | null => {
    for (const rx of predicates) {
      const match = assets.find(a => a.name && a.browser_download_url && rx.test(a.name))
      if (match && match.name && match.browser_download_url) {
        return {
          name: match.name,
          url: match.browser_download_url,
          sizeLabel: formatBytes(match.size)
        }
      }
    }
    return null
  }

  return {
    tagName: typeof json.tag_name === 'string' ? json.tag_name : 'Latest',
    publishedAt: typeof json.published_at === 'string' ? json.published_at : null,
    htmlUrl: typeof json.html_url === 'string' ? json.html_url : GITHUB_RELEASES_URL,
    windows: pickAsset([/\.exe$/i, /\.msi$/i]),
    macos: pickAsset([/\.dmg$/i, /mac.*\.zip$/i]),
    linux: pickAsset([/\.AppImage$/i, /\.deb$/i])
  }
}

