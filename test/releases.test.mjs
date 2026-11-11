import test from 'node:test'
import assert from 'node:assert/strict'
import {
  detectVisitorOS,
  parseSha256Sums,
  classifyReleaseAsset,
  transformReleasePayload,
  pickPrimaryAssetForOS
} from '../src/lib/releases.ts'

test('detectVisitorOS identifies Windows, macOS, Linux and excludes Android', () => {
  assert.equal(detectVisitorOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32'), 'windows')
  assert.equal(detectVisitorOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', 'MacIntel'), 'macos')
  assert.equal(detectVisitorOS('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64'), 'linux')
  assert.equal(detectVisitorOS('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 'Linux armv8l'), 'windows')
})

test('parseSha256Sums parses GNU coreutils sha256sum output formats', () => {
  const raw = [
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef  Selah-Setup-2.1.0-x64.exe',
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 *./dist/Selah-2.1.0-arm64.dmg',
    '# comment line ignored',
    ''
  ].join('\n')

  const parsed = parseSha256Sums(raw)
  assert.equal(
    parsed['Selah-Setup-2.1.0-x64.exe'],
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  )
  assert.equal(
    parsed['Selah-2.1.0-arm64.dmg'],
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'
  )
})

test('classifyReleaseAsset categorizes Windows, macOS, Linux assets and ignores metadata files', () => {
  const checksums = {
    'Selah-Setup-2.1.0-x64.exe': 'aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff66660000111122223333'
  }

  assert.equal(
    classifyReleaseAsset({
      name: 'Selah-Setup-2.1.0-x64.exe.blockmap',
      browser_download_url: 'https://example.com/a.blockmap',
      size: 100
    }),
    null
  )

  assert.equal(
    classifyReleaseAsset({
      name: 'latest.yml',
      browser_download_url: 'https://example.com/latest.yml',
      size: 200
    }),
    null
  )

  const winSetup = classifyReleaseAsset(
    {
      id: 1,
      name: 'Selah-Setup-2.1.0-x64.exe',
      browser_download_url: 'https://example.com/Selah-Setup-2.1.0-x64.exe',
      size: 95_000_000
    },
    checksums
  )
  assert.equal(winSetup?.os, 'windows')
  assert.equal(winSetup?.arch, 'x64')
  assert.equal(winSetup?.sha256, checksums['Selah-Setup-2.1.0-x64.exe'])

  const winPortable = classifyReleaseAsset({
    id: 2,
    name: 'Selah-Portable-2.1.0-x64.exe',
    browser_download_url: 'https://example.com/Selah-Portable-2.1.0-x64.exe',
    size: 94_000_000
  })
  assert.equal(winPortable?.os, 'windows')
  assert.equal(winPortable?.format, 'Portable EXE')

  const macArm = classifyReleaseAsset({
    id: 3,
    name: 'Selah-2.1.0-arm64.dmg',
    browser_download_url: 'https://example.com/Selah-2.1.0-arm64.dmg',
    size: 110_000_000
  })
  assert.equal(macArm?.os, 'macos')
  assert.equal(macArm?.arch, 'arm64')
  assert.equal(macArm?.format, 'Apple Disk Image (.dmg)')

  const macZip = classifyReleaseAsset({
    id: 4,
    name: 'Selah-2.1.0-x64-mac.zip',
    browser_download_url: 'https://example.com/Selah-2.1.0-x64-mac.zip',
    size: 105_000_000
  })
  assert.equal(macZip?.os, 'macos')
  assert.equal(macZip?.arch, 'x64')
  assert.equal(macZip?.format, 'ZIP Archive (.zip)')

  const linuxAppImage = classifyReleaseAsset({
    id: 5,
    name: 'Selah-2.1.0-x64.AppImage',
    browser_download_url: 'https://example.com/Selah-2.1.0-x64.AppImage',
    size: 100_000_000
  })
  assert.equal(linuxAppImage?.os, 'linux')
  assert.equal(linuxAppImage?.format, 'AppImage')

  const linuxDeb = classifyReleaseAsset({
    id: 6,
    name: 'selah-2.1.0-x64.deb',
    browser_download_url: 'https://example.com/selah-2.1.0-x64.deb',
    size: 80_000_000
  })
  assert.equal(linuxDeb?.os, 'linux')
  assert.equal(linuxDeb?.format, 'Debian / Ubuntu (.deb)')

  const linuxRpm = classifyReleaseAsset({
    id: 7,
    name: 'selah-2.1.0-x64.rpm',
    browser_download_url: 'https://example.com/selah-2.1.0-x64.rpm',
    size: 81_000_000
  })
  assert.equal(linuxRpm?.os, 'linux')
  assert.equal(linuxRpm?.format, 'Fedora / RHEL (.rpm)')
})

test('transformReleasePayload organizes assets by OS and pickPrimaryAssetForOS returns null when missing', () => {
  const summary = transformReleasePayload({
    tag_name: 'v2.1.0',
    name: 'Selah 2.1.0',
    published_at: '2026-11-11T10:00:00Z',
    html_url: 'https://github.com/Kaliza-e/Hello_118_24/releases/tag/v2.1.0',
    body: 'Cross-platform release.',
    assets: [
      {
        id: 1,
        name: 'Selah-Portable-2.1.0-x64.exe',
        browser_download_url: 'https://example.com/Selah-Portable-2.1.0-x64.exe',
        size: 90_000_000
      },
      {
        id: 2,
        name: 'Selah-Setup-2.1.0-x64.exe',
        browser_download_url: 'https://example.com/Selah-Setup-2.1.0-x64.exe',
        size: 91_000_000
      },
      {
        id: 3,
        name: 'SHA256SUMS.txt',
        browser_download_url: 'https://example.com/SHA256SUMS.txt',
        size: 512
      }
    ]
  })

  assert.equal(summary.tagName, 'v2.1.0')
  assert.equal(summary.checksumFileUrl, 'https://example.com/SHA256SUMS.txt')
  assert.equal(summary.assetsByOS.windows.length, 2)
  assert.equal(pickPrimaryAssetForOS(summary, 'windows')?.name, 'Selah-Setup-2.1.0-x64.exe')
  assert.equal(pickPrimaryAssetForOS(summary, 'macos'), null)
  assert.equal(pickPrimaryAssetForOS(summary, 'linux'), null)
})
