#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_URL = 'https://wiki.kurobbs.com/mc/item/1220879855033786368'
const DEFAULT_CATEGORY = 'Official Wiki'

function parseArgs(argv) {
  const args = {
    url: DEFAULT_URL,
    version: null,
    outDir: path.resolve('public/data'),
    category: DEFAULT_CATEGORY,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--url') args.url = argv[++i]
    else if (arg === '--version') args.version = argv[++i]
    else if (arg === '--out-dir') args.outDir = path.resolve(argv[++i])
    else if (arg === '--category') args.category = argv[++i]
    else if (arg === '--help') {
      printHelp()
      process.exit(0)
    }
  }

  if (!args.version) {
    throw new Error('Missing required argument: --version <semver-or-tag>')
  }

  return args
}

function printHelp() {
  console.log(`Sync achievements from official wiki page into public/data JSON.

Usage:
  node scripts/sync-achievements.mjs --version 2026-02-21

Options:
  --url <url>          Source URL (default: ${DEFAULT_URL})
  --version <version>  Target list version (required)
  --out-dir <path>     Output directory (default: public/data)
  --category <name>    Fallback category name (default: ${DEFAULT_CATEGORY})`)
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function stripTags(html) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function toId(input, prefix) {
  return `${prefix}_${input.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`
}

function looksLikeAchievement(item) {
  if (!item || typeof item !== 'object') return false

  const values = Object.values(item)
  const textValues = values.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
  if (textValues.length < 2) return false

  const first = textValues[0]
  const second = textValues[1]
  return first.length >= 2 && second.length >= 4
}

function extractFromTables(html, fallbackCategory) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  const items = []

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]))
    if (cells.length < 2) continue

    const name = cells[0]
    const description = cells.slice(1).join(' | ')
    if (!name || !description) continue

    const lowerName = name.toLowerCase()
    if (lowerName.includes('成就') || lowerName.includes('achievement') || lowerName.includes('名称')) {
      continue
    }

    items.push({
      id: toId(`${name}_${items.length + 1}`, 'achv'),
      name,
      description,
    })
  }

  if (items.length === 0) return []

  return [
    {
      id: toId(fallbackCategory, 'cat'),
      name: fallbackCategory,
      items,
    },
  ]
}

function collectObjects(value, sink = []) {
  if (Array.isArray(value)) {
    for (const child of value) collectObjects(child, sink)
    return sink
  }

  if (value && typeof value === 'object') {
    sink.push(value)
    for (const child of Object.values(value)) collectObjects(child, sink)
  }

  return sink
}

function normalizeFromObject(obj, index) {
  const name = (obj.name || obj.title || obj.label || obj.achievementName || '').toString().trim()
  const description = (obj.description || obj.desc || obj.content || obj.summary || '').toString().trim()
  const category = (obj.category || obj.group || obj.type || '').toString().trim()
  const pointsRaw = obj.points ?? obj.score ?? obj.point
  const wikiUrl = (obj.url || obj.link || '').toString().trim()

  if (!name || !description) return null

  const normalized = {
    id: toId(`${name}_${index + 1}`, 'achv'),
    name,
    description,
  }

  if (Number.isFinite(Number(pointsRaw)) || wikiUrl) {
    normalized.optional_meta = {}
    if (Number.isFinite(Number(pointsRaw))) normalized.optional_meta.points = Number(pointsRaw)
    if (wikiUrl) normalized.optional_meta.wiki_url = wikiUrl
  }

  return { category: category || null, item: normalized }
}

function extractFromEmbeddedJson(html, fallbackCategory) {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  const grouped = new Map()

  for (const script of scripts) {
    const content = script[1].trim()
    if (!content || (!content.startsWith('{') && !content.startsWith('['))) continue

    try {
      const parsed = JSON.parse(content)
      const objects = collectObjects(parsed)
      const candidates = []
      for (const [index, obj] of objects.entries()) {
        if (!looksLikeAchievement(obj)) continue
        const normalized = normalizeFromObject(obj, index)
        if (!normalized) continue
        candidates.push(normalized)
      }

      for (const candidate of candidates) {
        const bucket = candidate.category || fallbackCategory
        if (!grouped.has(bucket)) grouped.set(bucket, [])
        grouped.get(bucket).push(candidate.item)
      }
    } catch {
      // ignore non-JSON scripts
    }
  }

  return [...grouped.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([name, items]) => ({
      id: toId(name, 'cat'),
      name,
      items,
    }))
}

async function updateIndexFile(outDir, version) {
  const indexPath = path.join(outDir, 'index.json')
  let current = { latest: version, versions: [version] }

  try {
    const raw = await readFile(indexPath, 'utf8')
    current = JSON.parse(raw)
  } catch {
    // keep default if file does not exist or is malformed
  }

  const versions = Array.isArray(current.versions) ? current.versions.slice() : []
  if (!versions.includes(version)) versions.push(version)

  const next = {
    latest: version,
    versions,
  }

  await writeFile(indexPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const response = await fetch(args.url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; achievement-sync/1.0)',
      'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch source page (${response.status} ${response.statusText})`)
  }

  const html = await response.text()

  let categories = extractFromEmbeddedJson(html, args.category)
  if (categories.length === 0) {
    categories = extractFromTables(html, args.category)
  }

  if (categories.length === 0) {
    throw new Error('No achievements detected. Please inspect source page structure and update parser.')
  }

  const payload = {
    version: args.version,
    updated_at: new Date().toISOString().slice(0, 10),
    categories,
  }

  await mkdir(args.outDir, { recursive: true })
  const outPath = path.join(args.outDir, `achievements_v${args.version}.json`)
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await updateIndexFile(args.outDir, args.version)

  const total = categories.reduce((sum, cat) => sum + cat.items.length, 0)
  console.log(`Wrote ${total} achievements across ${categories.length} categories:`)
  console.log(`- ${outPath}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
