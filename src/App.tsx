import { useEffect, useState } from 'react'
import {
  Download,
  CalendarDays,
  Timer,
  Repeat,
  ShieldCheck,
  Terminal,
  Sliders,
  Monitor,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react'
import {
  detectVisitorOS,
  fetchLatestRelease,
  GITHUB_RELEASES_URL,
  GITHUB_REPO_URL,
  type DetectedOS,
  type ReleaseData
} from './lib/releases'

const OS_LABELS: Record<DetectedOS, string> = {
  windows: 'Windows (64-bit)',
  macos: 'macOS (Universal)',
  linux: 'Linux (AppImage / DEB)'
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
    a: 'No. Everything is stored locally on your device inside an isolated SQLite database. Document parsing and Tesseract OCR also execute locally in the desktop app.'
  },
  {
    q: 'What schedule formats can Selah import?',
    a: 'Selah accepts selectable PDFs, scanned image-based PDFs, DOCX files, XLSX spreadsheets, CSV files, PNG/JPG timetable screenshots, and standard .ics calendars.'
  },
  {
    q: 'Why does Windows SmartScreen sometimes warn on first install?',
    a: 'Open-source releases without a commercial EV signing certificate may prompt SmartScreen until sufficient download reputation is built. Choose "More info" then "Run anyway", or build directly from source on GitHub.'
  },
  {
    q: 'How do I back up or transfer my data to another computer?',
    a: 'Open Settings -> Data & Backup to export either a standard JSON snapshot (with merge or replace import support) or a password-protected AES-256 encrypted archive (.enc).'
  }
]

export default function App() {
  const [visitorOS] = useState<DetectedOS>(() => detectVisitorOS())
  const [release, setRelease] = useState<ReleaseData | null>(null)
  const [previewTab, setPreviewTab] = useState<'today' | 'schedules' | 'focus'>('today')
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchLatestRelease(controller.signal)
      .then(data => {
        if (data) setRelease(data)
      })
      .catch(() => {
        // Ignore network errors and keep fallback GitHub Releases link
      })
    return () => controller.abort()
  }, [])

  const primaryAsset =
    visitorOS === 'macos'
      ? release?.macos
      : visitorOS === 'linux'
        ? release?.linux
        : release?.windows

  const primaryDownloadUrl = primaryAsset?.url || release?.htmlUrl || GITHUB_RELEASES_URL
  const versionBadge = release?.tagName || 'Desktop Release'

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

          <a href={primaryDownloadUrl} className="nav-cta">
            <Download size={15} /> Download
          </a>
        </div>
      </nav>

      {/* Hero */}
      <header id="top" className="hero-section">
        <div className="container hero-grid">
          <div>
            <span className="release-pill">
              <CalendarDays size={14} /> {versionBadge} • Local-first desktop planner
            </span>

            <h1 className="hero-title">
              Your calm workspace for schedules, deadlines, and deep focus.
            </h1>

            <p className="hero-subtitle">
              Selah turns messy academic PDFs, spreadsheets, and daily tasks into one quiet,
              keyboard-friendly desktop companion. Built for Windows, macOS, and Linux.
            </p>

            <div className="hero-actions">
              <a href={primaryDownloadUrl} className="btn-primary">
                <Download size={16} />
                Download for {OS_LABELS[visitorOS]}
              </a>
              <a href="#download" className="btn-secondary">
                <Monitor size={15} /> All Platforms
              </a>
            </div>

            <div className="hero-meta">
              <span>{primaryAsset ? `${primaryAsset.name} (${primaryAsset.sizeLabel})` : 'Offline SQLite storage'}</span>
              <span>Free &amp; open source</span>
              <span>Zero telemetry</span>
            </div>
          </div>

          {/* Interactive Desktop Workspace Preview */}
          <div className="preview-window" aria-label="Interactive Selah interface preview">
            <div className="preview-titlebar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <img src="/icon.png" alt="" style={{ width: 18, height: 18, borderRadius: 4 }} />
                <span>Selah</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Week 46</span>
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
                        3 tasks planned • 1 upcoming seminar
                      </div>
                    </div>
                    <span className="os-badge">Ctrl+K Palette</span>
                  </div>
                  <div className="preview-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={16} color="var(--emerald)" />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Finalize systems design outline</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Today 14:00 • 45m • Weekly</div>
                      </div>
                    </div>
                    <span className="os-badge">2/3 steps</span>
                  </div>
                  <div className="preview-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Clock size={16} color="var(--cyan)" />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Distributed Algorithms Seminar</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>15:30 – 17:00 • Hall B-204</div>
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
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Source: ACADEMIC_CALENDAR.pdf • Reviewed</div>
                    </div>
                    <span className="os-badge">Exams</span>
                  </div>
                  <div className="preview-card">
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>Capstone Proposal Submission</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>All-day deadline • Reminder 24h before</div>
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

      {/* Downloads */}
      <section id="download" className="section" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-kicker">Installers</span>
            <h2 className="section-title">Download Selah ({versionBadge})</h2>
            <p className="section-desc">
              Prebuilt packages fetched directly from GitHub Releases. Need release archives or source builds?{' '}
              <a
                href={release?.htmlUrl || GITHUB_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                View all releases
              </a>
              .
            </p>
          </div>

          <div className="download-grid">
            {(['windows', 'macos', 'linux'] as DetectedOS[]).map(osKey => {
              const isCurrent = visitorOS === osKey
              const asset =
                osKey === 'windows' ? release?.windows : osKey === 'macos' ? release?.macos : release?.linux
              const fallbackText =
                osKey === 'windows'
                  ? 'NSIS Installer (.exe) for Windows 10 & 11 x64'
                  : osKey === 'macos'
                    ? 'Universal DMG package for Apple Silicon & Intel'
                    : 'AppImage and DEB packages for Ubuntu, Debian & Fedora'

              return (
                <div key={osKey} className={`download-card ${isCurrent ? 'recommended' : ''}`}>
                  {isCurrent && <span className="os-badge">Detected for your device</span>}
                  <h3 style={{ margin: 0, fontSize: 18 }}>{OS_LABELS[osKey]}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', flex: 1 }}>
                    {asset ? `${asset.name}${asset.sizeLabel ? ` • ${asset.sizeLabel}` : ''}` : fallbackText}
                  </p>
                  <a
                    href={asset?.url || release?.htmlUrl || GITHUB_RELEASES_URL}
                    className={isCurrent ? 'btn-primary' : 'btn-secondary'}
                    style={{ justifyContent: 'center' }}
                  >
                    <Download size={15} />
                    {asset ? `Download ${OS_LABELS[osKey].split(' ')[0]}` : 'Get from GitHub Releases'}
                  </a>
                </div>
              )
            })}
          </div>
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
            <span>Selah • MIT License • Local-first desktop planner</span>
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

