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
  sha256sums?: Record<string, string>
  assets?: GitHubApiAsset[]
}

const REPO_OWNER = 'Kaliza-e'
const REPO_NAME = 'Selah'
export const GITHUB_REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`
export const RELEASE_MANIFEST_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/release-manifest.json`

const CACHE_KEY = 'selah_release_cache_v4'
const CACHE_TTL_MS = 60 * 1000

export function compareSemver(a?: string | null, b?: string | null): number {
  const parse = (v?: string | null) =>
    String(v || '0.0.0')
      .replace(/^v/i, '')
      .split(/[-+]/)[0]
      .split('.')
      .map(n => parseInt(n, 10) || 0)
  const pa = parse(a)
  const pb = parse(b)
  const len = Math.max(pa.length, pb.length, 3)
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

const VERIFIED_V032_CHECKSUMS: Record<string, string> = {
  'Selah-Portable-0.3.2-x64.exe': 'a21f9761d9719b00541059314b5ea7bb8378ffee3d3735df282ec1a9cc6fbc7c',
  'Selah-Setup-0.3.2-x64.exe': '33495a196c64c96a6f90e157cb09930a47786fdffdbf9a5e414f61e9afae915a',
  'Selah-0.3.2-arm64.dmg': '77ef6d4bacfd6a45a31bc3213d240dfb21c241363697cb189bde57bb92df4d1f',
  'Selah-0.3.2-x64.dmg': 'c46f111e8cc79138e8f7cdb593a908db6a3593a36298c99ead8810d3a1312409',
  'Selah-0.3.2-arm64.zip': 'bb3b8a0c0298c33e25f290f84f0fe7bb156b8dc552ae9c4fbd6744505a728c7f',
  'Selah-0.3.2-x64.zip': 'f8d06a4e9466cacd934296bc245ebe5502b9c59084724bf58418523c488a879a',
  'selah-0.3.2-x86_64.AppImage': 'f53ed3771ec9fd889c3ed1c7aad3fa85873ee1944a848679f0339b33df887ebd',
  'selah-0.3.2-amd64.deb': '310f0e78c2fce086cd0f12e44ff331b145bbb37bdb9e7589bf64082028bb9b7b',
  'selah-0.3.2-x86_64.rpm': 'f6274f6871a5e3f613d98f4e2a61132accf720a60b442741c9117fa9236b8dc1'
}

const VERIFIED_V032_RAW: GitHubApiRelease = {
  tag_name: 'v0.3.2',
  name: 'Selah 0.3.2',
  published_at: '2026-11-11T11:22:28Z',
  html_url: 'https://github.com/Kaliza-e/Selah/releases/tag/v0.3.2',
  body: 'Cross-platform desktop release for Windows, macOS, and Linux with verified SHA-256 checksums.',
  prerelease: false,
  assets: [
    {
      id: 735258475,
      name: 'Selah-Setup-0.3.2-x64.exe',
      size: 105026683,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/Selah-Setup-0.3.2-x64.exe'
    },
    {
      id: 735258477,
      name: 'Selah-Portable-0.3.2-x64.exe',
      size: 104778059,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/Selah-Portable-0.3.2-x64.exe'
    },
    {
      id: 735258482,
      name: 'Selah-0.3.2-arm64.dmg',
      size: 132929737,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/Selah-0.3.2-arm64.dmg'
    },
    {
      id: 735258493,
      name: 'Selah-0.3.2-x64.dmg',
      size: 137552014,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/Selah-0.3.2-x64.dmg'
    },
    {
      id: 735258480,
      name: 'Selah-0.3.2-arm64.zip',
      size: 127976669,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/Selah-0.3.2-arm64.zip'
    },
    {
      id: 735258484,
      name: 'Selah-0.3.2-x64.zip',
      size: 132603862,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/Selah-0.3.2-x64.zip'
    },
    {
      id: 735258478,
      name: 'selah-0.3.2-x86_64.AppImage',
      size: 143240010,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/selah-0.3.2-x86_64.AppImage'
    },
    {
      id: 735258473,
      name: 'selah-0.3.2-amd64.deb',
      size: 88526238,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/selah-0.3.2-amd64.deb'
    },
    {
      id: 735258479,
      name: 'selah-0.3.2-x86_64.rpm',
      size: 88340717,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/selah-0.3.2-x86_64.rpm'
    },
    {
      id: 735258486,
      name: 'SHA256SUMS.txt',
      size: 806,
      browser_download_url: 'https://github.com/Kaliza-e/Selah/releases/download/v0.3.2/SHA256SUMS.txt'
    }
  ]
}

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

export const BASELINE_RELEASE: ReleaseSummary = transformReleasePayload(
  VERIFIED_V032_RAW,
  VERIFIED_V032_CHECKSUMS
)

export const BASELINE_HISTORY: PastReleaseItem[] = [
  {
    tagName: BASELINE_RELEASE.tagName,
    name: BASELINE_RELEASE.name,
    publishedAt: BASELINE_RELEASE.publishedAt,
    htmlUrl: BASELINE_RELEASE.htmlUrl,
    assetCount: 9,
    prerelease: false
  }
]

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
        if (
          parsed &&
          parsed.latest?.hasAnyAssets &&
          typeof parsed.fetchedAt === 'number' &&
          Date.now() - parsed.fetchedAt < CACHE_TTL_MS
        ) {
          return { ...parsed, fromCache: true }
        }
      }
    } catch {
      // Ignore invalid cache entries
    }
  }

  const listUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=8`

  const [apiResult, manifestResult] = await Promise.allSettled([
    fetch(listUrl, {
      signal: options?.signal,
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' }
    }).then(async res => {
      if (!res.ok) throw new Error(`GitHub Releases API returned status ${res.status}`)
      return (await res.json()) as GitHubApiRelease[]
    }),
    fetch(RELEASE_MANIFEST_URL, {
      signal: options?.signal,
      cache: 'no-store'
    }).then(async res => {
      if (!res.ok) throw new Error(`Release manifest returned status ${res.status}`)
      return (await res.json()) as GitHubApiRelease
    })
  ])

  const rawList = apiResult.status === 'fulfilled' && Array.isArray(apiResult.value) ? apiResult.value : []
  const published = rawList.filter(r => !r.draft)
  const apiLatest = published.find(r => !r.prerelease) || published[0] || null
  const manifestLatest =
    manifestResult.status === 'fulfilled' && manifestResult.value?.tag_name ? manifestResult.value : null

  if (!apiLatest && !manifestLatest) {
    throw new Error('Unable to fetch latest release metadata from GitHub Releases or release-manifest.json')
  }

  let latestRaw: GitHubApiRelease | null = apiLatest
  if (manifestLatest && (!apiLatest || compareSemver(manifestLatest.tag_name, apiLatest.tag_name) > 0)) {
    latestRaw = manifestLatest
  }

  let checksumMap: Record<string, string> = {}
  if (manifestLatest?.sha256sums && latestRaw?.tag_name === manifestLatest.tag_name) {
    checksumMap = { ...manifestLatest.sha256sums }
  }

  if (Object.keys(checksumMap).length === 0 && latestRaw && Array.isArray(latestRaw.assets)) {
    const checksumAsset = latestRaw.assets.find(
      a => a.name && /sha256/i.test(a.name) && a.name.endsWith('.txt') && a.browser_download_url
    )
    if (checksumAsset?.browser_download_url) {
      try {
        const sumRes = await fetch(checksumAsset.browser_download_url, {
          signal: options?.signal,
          cache: 'no-store'
        })
        if (sumRes.ok) {
          checksumMap = parseSha256Sums(await sumRes.text())
        }
      } catch {
        // Checksum file fetch failure is non-fatal (e.g., CORS redirect restrictions on release assets)
      }
    }
  }

  if (Object.keys(checksumMap).length === 0 && latestRaw?.tag_name === VERIFIED_V032_RAW.tag_name) {
    checksumMap = VERIFIED_V032_CHECKSUMS
  }

  const latest = latestRaw ? transformReleasePayload(latestRaw, checksumMap) : null
  const historySource = published.length > 0 ? published : manifestLatest ? [manifestLatest] : []
  const history: PastReleaseItem[] = historySource.map(item => ({
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

  if (latest?.hasAnyAssets && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(result))
    } catch {
      // Ignore storage quota errors
    }
  }

  return result
}
