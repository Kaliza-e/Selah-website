import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  History,
  Info,
  Monitor,
  RefreshCw,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Terminal,
  Timer
} from 'lucide-react'
import {
  BASELINE_HISTORY,
  BASELINE_RELEASE,
  detectVisitorOS,
  fetchReleasesData,
  formatReleaseDate,
  GITHUB_RELEASES_URL,
  GITHUB_REPO_URL,
  pickPrimaryAssetForOS,
  type DetectedOS,
  type PastReleaseItem,
  type ReleaseAssetEntry,
  type ReleaseSummary
} from './lib/releases'

const OS_META: Record<
  DetectedOS,
  {
    name: string
    heroLabel: string
    subtitle: string
    installSteps: string[]
    securityNote: string
    requirements: string[]
  }
> = {
  windows: {
    name: 'Windows',
    heroLabel: 'Windows (64-bit)',
    subtitle: 'NSIS installer (.exe) or Portable executable for Windows 10 & 11 x64.',
    installSteps: [
      'Download Selah Setup (.exe) for standard Start Menu installation, or the Portable (.exe) build to run without installing.',
      'Double-click the downloaded .exe file. User data is stored safely in %APPDATA%\\Selah (never inside temporary folders).',
      'If updating from an older version or Hello 118:24, existing SQLite schedules and tasks migrate automatically.'
    ],
    securityNote:
      'Unsigned Windows builds may trigger Microsoft Defender SmartScreen until download reputation builds. Click "More info" and then "Run anyway", or verify the file SHA-256 against SHA256SUMS.txt before launching.',
    requirements: [
      'Windows 10 or Windows 11 (64-bit x64)',
      '200 MB free disk space',
      '4 GB RAM recommended',
      'Offline capable after install'
    ]
  },
  macos: {
    name: 'macOS',
    heroLabel: 'macOS (Apple Silicon & Intel)',
    subtitle: 'Disk image (.dmg) and ZIP archive builds for Apple Silicon (arm64) and Intel (x64).',
    installSteps: [
      'Choose the Apple Silicon (arm64) DMG for M1/M2/M3/M4 Macs, or the Intel (x64) DMG for Intel Macs.',
      'Open the .dmg image and drag Selah.app into your Applications folder.',
      'Your local SQLite database lives in ~/Library/Application Support/Selah and stays intact across updates.'
    ],
    securityNote:
      'Until Apple Developer notarization secrets are configured on a release, macOS Gatekeeper may warn on first launch. Open Finder, Control-click Selah.app, choose "Open", and confirm.',
    requirements: [
      'macOS 12 Monterey or newer',
      'Apple Silicon (arm64) or Intel (x64)',
      '250 MB free disk space',
      '4 GB RAM recommended'
    ]
  },
  linux: {
    name: 'Linux',
    heroLabel: 'Linux (AppImage / DEB / RPM)',
    subtitle: 'AppImage, Debian/Ubuntu (.deb), and Fedora/RHEL (.rpm) packages for 64-bit x64 Linux.',
    installSteps: [
      'AppImage: Run chmod +x Selah-*.AppImage && ./Selah-*.AppImage (requires libfuse2 on Ubuntu 22.04+).',
      'Debian / Ubuntu (.deb): Install via sudo apt install ./selah-*.deb.',
      'Fedora / RHEL (.rpm): Install via sudo dnf install ./selah-*.rpm. Data persists in ~/.config/Selah.'
    ],
    securityNote:
      'Linux packages are published directly from GitHub Actions. Always compare the downloaded file SHA-256 hash with SHA256SUMS.txt before granting execute permission or installing system-wide.',
    requirements: [
      '64-bit Linux (Ubuntu 20.04+, Debian 11+, Fedora 38+)',
      'x86_64 (x64) architecture',
      'X11 or Wayland desktop environment',
      '200 MB free disk space'
    ]
  }
}

const FEATURES = [
  {
    icon: FileText,
    title: 'Flexible Schedule Ingestion',
    description:
      'Import PDF academic calendars, scanned timetables with local OCR, DOCX outlines, Excel sheets, CSVs, and ICS feeds into one chronological view.'
  },
  {
    icon: Timer,
    title: 'Focus & Pomodoro Companion',
    description:
      'Run customizable focus and break blocks with a gentle chime, header countdown pill, and automatic time tracking per task.'
  },
  {
    icon: Repeat,
    title: 'Recurring Tasks & Subtasks',
    description:
      'Set daily, weekday, weekly, or monthly habits with nested checklists and one-click overdue task rollover.'
  },
  {
    icon: ShieldCheck,
    title: 'Local-First & Private',
    description:
      'Your timetable, tasks, and notes live locally in SQLite on your device with optional PIN lock and AES-256 encrypted backups.'
  },
  {
    icon: Terminal,
    title: 'Command Palette & Tray Capture',
    description:
      'Press Ctrl+K to jump anywhere or Ctrl+Shift+Space globally to capture a task without breaking focus.'
  },
  {
    icon: Sliders,
    title: 'Adaptive Theme & Scale',
    description:
      'Switch smoothly between dark, light, and system appearance, pick custom accent colors, and scale the workspace from 360px to 4K.'
  }
]

const FAQS = [
  {
    q: 'Does Selah send my schedules or notes to any cloud server?',
    a: 'No. Everything is stored locally on your device inside an isolated SQLite database. Document parsing and Tesseract OCR execute locally in the desktop app.'
  },
  {
    q: 'What schedule formats can Selah import?',
    a: 'Selah accepts selectable PDFs, scanned image-based PDFs, DOCX files, XLSX spreadsheets, CSV files, PNG/JPG timetable screenshots, and standard .ics calendars.'
  },
  {
    q: 'Why do operating systems warn on unsigned open-source installers?',
    a: 'Commercial code signing certificates and Apple notarization require paid developer accounts. When a release is unsigned, Windows SmartScreen or macOS Gatekeeper shows a prompt; you can verify SHA-256 checksums or inspect and build the full source on GitHub.'
  },
  {
    q: 'Do updates or reinstalls erase my SQLite database?',
    a: 'No. Selah stores selah.sqlite inside your OS userData directory (and keeps automatic backups before startup migrations), separate from the application binary directory.'
  }
]

function renderReleaseNotesParagraphs(body: string): string[] {
  return body
    .split(/\r?\n\r?\n/)
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .slice(0, 6)
}

export default function App() {
  const [visitorOS] = useState<DetectedOS>(() => detectVisitorOS())
  const [selectedOS, setSelectedOS] = useState<DetectedOS>(() => detectVisitorOS())
  const [latest, setLatest] = useState<ReleaseSummary | null>(() => BASELINE_RELEASE)
  const [history, setHistory] = useState<PastReleaseItem[]>(() => BASELINE_HISTORY)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'today' | 'schedules' | 'focus'>('today')
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0)

  const loadReleases = useCallback(async (forceRefresh = false, signal?: AbortSignal) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const result = await fetchReleasesData({ forceRefresh, signal })
      if (result.latest?.hasAnyAssets) {
        setLatest(result.latest)
      }
      if (result.history.length > 0) {
        setHistory(result.history)
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setErrorMsg('Live GitHub metadata check could not refresh right now. Showing verified release installers below.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadReleases(false, controller.signal)
    return () => controller.abort()
  }, [loadReleases])

  const handleCopySha = async (asset: ReleaseAssetEntry) => {
    if (!asset.sha256) return
    try {
      await navigator.clipboard.writeText(asset.sha256)
      setCopiedHashId(asset.id)
      window.setTimeout(() => {
        setCopiedHashId(prev => (prev === asset.id ? null : prev))
      }, 2000)
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  }

  const primaryVisitorAsset = pickPrimaryAssetForOS(latest, visitorOS)
  const primaryDownloadUrl = primaryVisitorAsset?.url || latest?.htmlUrl || GITHUB_RELEASES_URL
  const versionBadge = latest?.tagName || 'Desktop Release'
  const selectedOSAssets = latest ? latest.assetsByOS[selectedOS] : []
  const selectedOSMeta = OS_META[selectedOS]
  const releaseNotesParagraphs = latest?.body ? renderReleaseNotesParagraphs(latest.body) : []

  return (
    <div>
      {/* Navigation */}
      <nav className="site-nav">
        <div className="container nav-inner">
          <a href="#top" className="brand-link">
            <img src="/icon.png" alt="Selah logo" className="brand-icon" />
            <span>Selah</span>
          </a>

          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#download">Download</a>
            <a href="#faq">FAQ</a>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>

          <a href={primaryDownloadUrl} download={primaryVisitorAsset?.name} className="nav-cta">
            <Download size={15} /> Download
          </a>
        </div>
      </nav>

      {/* Hero */}
      <header id="top" className="hero-section">
        <div className="container hero-grid">
          <div>
            <span className="release-pill">
              <CalendarDays size={14} /> {versionBadge} | Local-first desktop planner
            </span>

            <h1 className="hero-title">
              Your calm workspace for schedules, deadlines, and deep focus.
            </h1>

            <p className="hero-subtitle">
              Selah turns messy academic PDFs, spreadsheets, and daily tasks into one quiet,
              keyboard-friendly desktop companion. Built for Windows, macOS, and Linux.
            </p>

            <div className="hero-actions">
              <a
                href={primaryDownloadUrl}
                download={primaryVisitorAsset?.name}
                className="btn-primary"
                target={primaryVisitorAsset ? undefined : '_blank'}
                rel={primaryVisitorAsset ? undefined : 'noopener noreferrer'}
              >
                <Download size={16} />
                {primaryVisitorAsset
                  ? `Download for ${OS_META[visitorOS].heroLabel}`
                  : `View ${OS_META[visitorOS].name} on GitHub Releases`}
              </a>
              <a href="#download" className="btn-secondary">
                <Monitor size={15} /> All Platforms
              </a>
            </div>

            <div className="hero-meta">
              {primaryVisitorAsset ? (
                <span className="os-badge">Recommended for your device</span>
              ) : (
                <span>Detected platform: {OS_META[visitorOS].name}</span>
              )}
              <span>
                {primaryVisitorAsset
                  ? `${primaryVisitorAsset.name} (${primaryVisitorAsset.sizeLabel})`
                  : 'Offline SQLite storage'}
              </span>
              <span>Free &amp; open source</span>
            </div>
          </div>

          {/* Interactive Desktop Workspace Preview */}
          <div className="preview-window" aria-label="Interactive Selah interface preview">
            <div className="preview-titlebar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <img src="/icon.png" alt="" style={{ width: 18, height: 18, borderRadius: 4 }} />
                <span>Selah</span>
              </div>
              <div className="preview-tabs" role="tablist" aria-label="Workspace preview tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === 'today'}
                  className={`preview-tab-btn ${previewTab === 'today' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('today')}
                >
                  Home
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === 'schedules'}
                  className={`preview-tab-btn ${previewTab === 'schedules' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('schedules')}
                >
                  Schedules
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === 'focus'}
                  className={`preview-tab-btn ${previewTab === 'focus' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('focus')}
                >
                  Focus
                </button>
              </div>
            </div>

            <div className="preview-body">
              {previewTab === 'today' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>Good morning</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        3 tasks planned | 1 upcoming seminar
                      </div>
                    </div>
                    <span className="os-badge">Ctrl+K Palette</span>
                  </div>
                  <div className="preview-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={16} color="var(--emerald)" />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Finalize systems design outline</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Today 14:00 | 45m | Weekly</div>
                      </div>
                    </div>
                    <span className="os-badge">2/3 steps</span>
                  </div>
                  <div className="preview-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Clock size={16} color="var(--cyan)" />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Distributed Algorithms Seminar</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>15:30 - 17:00 | Hall B-204</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>In 1h 20m</span>
                  </div>
                </>
              )}

              {previewTab === 'schedules' && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Parsed Academic Calendar &amp; Exam Dates
                  </div>
                  <div className="preview-card">
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>Midterm Assessments Window</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Source: ACADEMIC_CALENDAR.pdf | Reviewed
                      </div>
                    </div>
                    <span className="os-badge">Exams</span>
                  </div>
                  <div className="preview-card">
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>Capstone Proposal Submission</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        All-day deadline | Reminder 24h before
                      </div>
                    </div>
                    <span className="os-badge">Assignments</span>
                  </div>
                </>
              )}

              {previewTab === 'focus' && (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      width: 118,
                      height: 118,
                      borderRadius: '50%',
                      border: '3px solid var(--accent)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--accent-soft)'
                    }}
                  >
                    <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
                      Pomodoro
                    </span>
                    <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace' }}>24:18</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Study block synchronized with header countdown pill
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-kicker">Features</span>
            <h2 className="section-title">Everything you need, without cloud clutter</h2>
            <p className="section-desc">
              Designed to keep schedules, tasks, and focus sessions fast, readable, and completely under your control.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map(feature => {
              const Icon = feature.icon
              return (
                <article key={feature.title} className="feature-card">
                  <div className="feature-icon-box">
                    <Icon size={20} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Multi-Platform Download Center */}
      <section id="download" className="section" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-kicker">Multi-Platform Installers</span>
            <h2 className="section-title">Download Selah ({versionBadge})</h2>
            <p className="section-desc">
              Packages are retrieved live from GitHub Releases
              {latest?.publishedAt ? ` | Released ${formatReleaseDate(latest.publishedAt)}` : ''}.{' '}
              <a
                href={latest?.htmlUrl || GITHUB_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                Open GitHub Releases
              </a>
              .
            </p>
          </div>

          {/* OS Switcher & Refresh */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20
            }}
          >
            <div className="os-tabs" role="tablist" aria-label="Operating system downloads">
              {(['windows', 'macos', 'linux'] as DetectedOS[]).map(osKey => {
                const isSelected = selectedOS === osKey
                const isVisitorOS = visitorOS === osKey
                return (
                  <button
                    key={osKey}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`os-tab-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedOS(osKey)}
                  >
                    <span>{OS_META[osKey].name}</span>
                    {isVisitorOS && <span className="os-tab-tag">Recommended</span>}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '9px 14px', fontSize: 13 }}
              onClick={() => void loadReleases(true)}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
              {loading ? 'Refreshing...' : 'Refresh builds'}
            </button>
          </div>

          {errorMsg && (
            <div
              className="info-panel"
              style={{
                marginBottom: 20,
                borderColor: 'var(--border-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text-secondary)' }}>
                <AlertCircle size={16} color="var(--accent)" />
                <span>{errorMsg}</span>
              </div>
              <a
                href={GITHUB_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: '7px 14px', fontSize: 13 }}
              >
                Open GitHub Releases <ExternalLink size={13} />
              </a>
            </div>
          )}

          <div className="download-center-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 22 }}>{selectedOSMeta.name} Downloads</h3>
                  {visitorOS === selectedOS && <span className="os-badge">Recommended for your device</span>}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                  {selectedOSMeta.subtitle}
                </p>
              </div>

              {latest?.checksumFileUrl && (
                <a
                  href={latest.checksumFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: 12.5 }}
                >
                  <ShieldCheck size={14} /> SHA256SUMS.txt
                </a>
              )}
            </div>

            {/* Assets for Selected OS */}
            {loading && !latest ? (
              <div className="info-panel" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Loading installers from GitHub Releases...
              </div>
            ) : selectedOSAssets.length > 0 ? (
              <div className="asset-list">
                {selectedOSAssets.map((asset, index) => {
                  const isPrimary = index === 0
                  const isCopied = copiedHashId === asset.id
                  return (
                    <article
                      key={asset.id}
                      className={`asset-card ${isPrimary ? 'primary-asset' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 15.5 }}>{asset.label}</strong>
                        <span className="os-badge">{asset.format}</span>
                      </div>

                      <div className="asset-meta-row">
                        <span>Arch: {asset.arch}</span>
                        <span>|</span>
                        <span>Size: {asset.sizeLabel}</span>
                        {latest?.tagName && (
                          <>
                            <span>|</span>
                            <span>{latest.tagName}</span>
                          </>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all'
                        }}
                      >
                        {asset.name}
                      </div>

                      {asset.sha256 && (
                        <div>
                          <button
                            type="button"
                            className="checksum-chip"
                            onClick={() => void handleCopySha(asset)}
                            title={asset.sha256}
                          >
                            {isCopied ? <Check size={12} color="var(--emerald)" /> : <Copy size={12} />}
                            <span>
                              {isCopied
                                ? 'Copied SHA-256'
                                : `SHA-256: ${asset.sha256.slice(0, 14)}...`}
                            </span>
                          </button>
                        </div>
                      )}

                      <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                        <a
                          href={asset.url}
                          download={asset.name}
                          className={isPrimary ? 'btn-primary' : 'btn-secondary'}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <Download size={15} /> Download {asset.format}
                        </a>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="info-panel">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Info size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text)' }}>
                      No {selectedOSMeta.name} binary asset is attached to {latest?.tagName || 'this release'} yet.
                    </strong>
                    <div style={{ marginTop: 4 }}>
                      Cross-platform installers are published when a release tag completes across all GitHub Actions
                      runners. Check the{' '}
                      <a
                        href={latest?.htmlUrl || GITHUB_RELEASES_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                      >
                        GitHub Releases page
                      </a>{' '}
                      or build locally from source.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Install Guidance + System Requirements */}
            <div className="install-grid">
              <div className="info-panel">
                <h4>
                  <Terminal size={15} color="var(--accent)" /> Installation Steps ({selectedOSMeta.name})
                </h4>
                <ol className="step-list">
                  {selectedOSMeta.installSteps.map(step => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: 12.5,
                    color: 'var(--text-muted)'
                  }}
                >
                  <ShieldAlert size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{selectedOSMeta.securityNote}</span>
                </div>
              </div>

              <div className="info-panel">
                <h4>
                  <Cpu size={15} color="var(--accent)" /> System Requirements
                </h4>
                <ul className="step-list" style={{ listStyle: 'disc' }}>
                  {selectedOSMeta.requirements.map(req => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Release Notes */}
          {releaseNotesParagraphs.length > 0 && latest && (
            <div className="release-notes-box">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 10
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  Release Notes: {latest.name} ({latest.tagName})
                </h3>
                {latest.publishedAt && (
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    Published {formatReleaseDate(latest.publishedAt)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, color: 'var(--text-secondary)' }}>
                {releaseNotesParagraphs.map((paragraph, index) => (
                  <p key={`${latest.tagName}-note-${index}`} style={{ margin: 0, whiteSpace: 'pre-line' }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Previous Releases */}
          {history.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <History size={16} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: 16 }}>Release History</h3>
              </div>
              <div className="history-grid">
                {history.map(item => (
                  <a
                    key={item.tagName}
                    href={item.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="history-card"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: 14 }}>{item.tagName}</strong>
                      <ExternalLink size={13} color="var(--text-muted)" />
                    </div>
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{item.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {formatReleaseDate(item.publishedAt)} | {item.assetCount}{' '}
                      {item.assetCount === 1 ? 'package' : 'packages'}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-kicker">FAQ</span>
            <h2 className="section-title">Common questions</h2>
          </div>

          <div className="faq-list">
            {FAQS.map((item, idx) => {
              const isOpen = openFaqIdx === idx
              return (
                <div key={item.q} className="faq-item">
                  <button
                    type="button"
                    className="faq-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={18}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }}
                    />
                  </button>
                  {isOpen && <div className="faq-body">{item.a}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon.png" alt="Selah" style={{ width: 20, height: 20, borderRadius: 4 }} />
            <span>Selah | MIT License | Local-first desktop planner</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              Source on GitHub <ExternalLink size={13} />
            </a>
            <a href={GITHUB_RELEASES_URL} target="_blank" rel="noopener noreferrer">
              Releases
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
