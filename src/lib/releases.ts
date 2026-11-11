export type DetectedOS = 'windows' | 'macos' | 'linux'

export type ArchitectureLabel = 'x64' | 'arm64' | 'Universal'

export interface ReleaseAssetEntry {
  id: string
  name: string
  url: string
  sizeBytes: number
  sizeLabel: string
  os: DetectedOS
  arch: ArchitectureLabel
  format: string
  label: string
  recommendedOrder: number
  sha256: string | null
}

export interface ReleaseSummary {
  tagName: string
  name: string
  publishedAt: string | null
  htmlUrl: string
  body: string
  prerelease: boolean
  assetsByOS: Record<DetectedOS, ReleaseAssetEntry[]>
  checksumFileUrl: string | null
  hasAnyAssets: boolean
}

export interface PastReleaseItem {
  tagName: string
  name: string
  publishedAt: string | null
  htmlUrl: string
  assetCount: number
  prerelease: boolean
}

export interface ReleasesFetchResult {
  latest: ReleaseSummary | null
  history: PastReleaseItem[]
  fetchedAt: number
  fromCache: boolean
}

export interface GitHubApiAsset {
  id?: number
  name?: string
  browser_download_url?: string
  size?: number
}

export interface GitHubApiRelease {
  tag_name?: string
  name?: string
  published_at?: string
  html_url?: string
  body?: string
  prerelease?: boolean
  draft?: boolean
  assets?: GitHubApiAsset[]
}

const REPO_OWNER = 'Kaliza-e'
const REPO_NAME = 'Hello_118_24'
export const GITHUB_REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`

const CACHE_KEY = 'selah_release_cache_v2'
const CACHE_TTL_MS = 5 * 60 * 1000

export function detectVisitorOS(userAgentInput?: string, platformInput?: string): DetectedOS {
  const uaSource =
    userAgentInput !== undefined
      ? `${userAgentInput} ${platformInput || ''}`
      : typeof navigator !== 'undefined'
        ? `${navigator.userAgent} ${navigator.platform}`
        : ''
  const ua = uaSource.toLowerCase()
  if (ua.includes('mac') || ua.includes('darwin')) return 'macos'
  if (ua.includes('linux') && !ua.includes('android')) return 'linux'
  return 'windows'
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Unknown size'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

export function formatReleaseDate(iso?: string | null): string {
  if (!iso) return 'Date unavailable'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Date unavailable'
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function parseSha256Sums(text: string): Record<string, string> {
  const map: Record<string, string> = {}
  if (!text) return map
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i)
    if (match) {
      const hash = match[1].toLowerCase()
      const fileName = match[2].trim().split(/[\\/]/).pop() || match[2].trim()
      map[fileName] = hash
    }
  }
  return map
}

export function detectArchitecture(fileName: string): ArchitectureLabel {
  const lower = fileName.toLowerCase()
  if (lower.includes('arm64') || lower.includes('aarch64')) return 'arm64'
  if (lower.includes('universal')) return 'Universal'
  return 'x64'
}

export function classifyReleaseAsset(
  asset: GitHubApiAsset,
  checksumMap: Record<string, string> = {}
): ReleaseAssetEntry | null {
  const name = asset.name?.trim()
  const url = asset.browser_download_url?.trim()
  if (!name || !url) return null

  const lower = name.toLowerCase()
  if (
    lower.endsWith('.blockmap') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.sig')
  ) {
    return null
  }

  const arch = detectArchitecture(name)
  const sizeBytes = typeof asset.size === 'number' ? asset.size : 0
  const base = {
    id: String(asset.id ?? name),
    name,
    url,
    sizeBytes,
    sizeLabel: formatBytes(sizeBytes),
    arch,
    sha256: checksumMap[name] || null
  }

  // Windows installers
  if (lower.endsWith('.exe') || lower.endsWith('.msi')) {
    const isPortable = lower.includes('portable')
    return {
      ...base,
      os: 'windows',
      format: isPortable ? 'Portable EXE' : 'NSIS Installer (.exe)',
      label: isPortable
        ? `Windows Portable (${arch})`
        : `Windows Installer (${arch})`,
      recommendedOrder: isPortable ? 2 : 1
    }
  }

  // macOS installers
  if (lower.endsWith('.dmg')) {
    return {
      ...base,
      os: 'macos',
      format: 'Apple Disk Image (.dmg)',
      label: arch === 'arm64' ? 'Apple Silicon (arm64 .dmg)' : arch === 'Universal' ? 'Universal macOS (.dmg)' : 'Intel Mac (x64 .dmg)',
      recommendedOrder: arch === 'arm64' ? 1 : 2
    }
  }

  if (lower.endsWith('.zip') && (lower.includes('mac') || lower.includes('darwin') || lower.includes('arm64') || lower.includes('selah'))) {
    return {
      ...base,
      os: 'macos',
      format: 'ZIP Archive (.zip)',
      label: `macOS Archive (${arch} .zip)`,
      recommendedOrder: 3
    }
  }

  // Linux packages
  if (lower.endsWith('.appimage')) {
    return {
      ...base,
      os: 'linux',
      format: 'AppImage',
      label: `Linux AppImage (${arch})`,
      recommendedOrder: 1
    }
  }

  if (lower.endsWith('.deb')) {
    return {
      ...base,
      os: 'linux',
      format: 'Debian / Ubuntu (.deb)',
      label: `Debian / Ubuntu (${arch} .deb)`,
      recommendedOrder: 2
    }
  }

  if (lower.endsWith('.rpm')) {
    return {
      ...base,
      os: 'linux',
      format: 'Fedora / RHEL (.rpm)',
      label: `Fedora / RHEL (${arch} .rpm)`,
      recommendedOrder: 3
    }
  }

  return null
}

export function transformReleasePayload(
  raw: GitHubApiRelease,
  checksumMap: Record<string, string> = {}
): ReleaseSummary {
  const assets = Array.isArray(raw.assets) ? raw.assets : []
  const assetsByOS: Record<DetectedOS, ReleaseAssetEntry[]> = {
    windows: [],
    macos: [],
    linux: []
  }

  let checksumFileUrl: string | null = null

  for (const rawAsset of assets) {
    if (rawAsset.name && /sha256/i.test(rawAsset.name) && rawAsset.name.endsWith('.txt') && rawAsset.browser_download_url) {
      checksumFileUrl = rawAsset.browser_download_url
      continue
    }
    const classified = classifyReleaseAsset(rawAsset, checksumMap)
    if (classified) {
      assetsByOS[classified.os].push(classified)
    }
  }

  ;(['windows', 'macos', 'linux'] as DetectedOS[]).forEach(osKey => {
    assetsByOS[osKey].sort((a, b) => a.recommendedOrder - b.recommendedOrder)
  })

  const tagName = typeof raw.tag_name === 'string' && raw.tag_name.trim() ? raw.tag_name.trim() : 'Latest'
  const releaseName = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : tagName

  const hasAnyAssets =
    assetsByOS.windows.length > 0 ||
    assetsByOS.macos.length > 0 ||
    assetsByOS.linux.length > 0

  return {
    tagName,
    name: releaseName,
    publishedAt: typeof raw.published_at === 'string' ? raw.published_at : null,
    htmlUrl: typeof raw.html_url === 'string' ? raw.html_url : GITHUB_RELEASES_URL,
    body: typeof raw.body === 'string' ? raw.body.trim() : '',
    prerelease: Boolean(raw.prerelease),
    assetsByOS,
    checksumFileUrl,
    hasAnyAssets
  }
}

export function pickPrimaryAssetForOS(summary: ReleaseSummary | null, os: DetectedOS): ReleaseAssetEntry | null {
  if (!summary) return null
  return summary.assetsByOS[os]?.[0] || null
}

export async function fetchReleasesData(
  options?: { signal?: AbortSignal; forceRefresh?: boolean }
): Promise<ReleasesFetchResult> {
  if (!options?.forceRefresh && typeof sessionStorage !== 'undefined') {
    try {
      const cachedRaw = sessionStorage.getItem(CACHE_KEY)
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw) as ReleasesFetchResult
        if (parsed && typeof parsed.fetchedAt === 'number' && Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
          return { ...parsed, fromCache: true }
        }
      }
    } catch {
      // Ignore invalid cache entries
    }
  }

  const listUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=8`
  const res = await fetch(listUrl, {
    signal: options?.signal,
    headers: { Accept: 'application/vnd.github+json' }
  })

  if (!res.ok) {
    throw new Error(`GitHub Releases API returned status ${res.status}`)
  }

  const rawList = (await res.json()) as GitHubApiRelease[]
  const published = Array.isArray(rawList) ? rawList.filter(r => !r.draft) : []
  const latestRaw = published.find(r => !r.prerelease) || published[0] || null

  let checksumMap: Record<string, string> = {}
  if (latestRaw && Array.isArray(latestRaw.assets)) {
    const checksumAsset = latestRaw.assets.find(
      a => a.name && /sha256/i.test(a.name) && a.name.endsWith('.txt') && a.browser_download_url
    )
    if (checksumAsset?.browser_download_url) {
      try {
        const sumRes = await fetch(checksumAsset.browser_download_url, { signal: options?.signal })
        if (sumRes.ok) {
          checksumMap = parseSha256Sums(await sumRes.text())
        }
      } catch {
        // Checksum file fetch failure is non-fatal (e.g., CORS redirect restrictions on release assets)
      }
    }
  }

  const latest = latestRaw ? transformReleasePayload(latestRaw, checksumMap) : null
  const history: PastReleaseItem[] = published.map(item => ({
    tagName: item.tag_name || 'Release',
    name: item.name || item.tag_name || 'Release',
    publishedAt: item.published_at || null,
    htmlUrl: item.html_url || GITHUB_RELEASES_URL,
    assetCount: Array.isArray(item.assets) ? item.assets.filter(a => classifyReleaseAsset(a) !== null).length : 0,
    prerelease: Boolean(item.prerelease)
  }))

  const result: ReleasesFetchResult = {
    latest,
    history,
    fetchedAt: Date.now(),
    fromCache: false
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(result))
    } catch {
      // Ignore storage quota errors
    }
  }

  return result
}
