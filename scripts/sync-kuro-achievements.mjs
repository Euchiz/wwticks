#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'

const DEFAULT_SOURCE_URL = 'https://wiki.kurobbs.com/mc/item/1220879855033786368'
const DEFAULT_INDEX_PATH = 'public/data/index.json'
const DEFAULT_OUTPUT_DIR = 'public/data'

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE_URL,
    version: '',
    output: '',
    index: DEFAULT_INDEX_PATH,
    input: '',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--source') args.source = argv[++i] ?? args.source
    else if (token === '--version') args.version = argv[++i] ?? args.version
    else if (token === '--output') args.output = argv[++i] ?? args.output
    else if (token === '--index') args.index = argv[++i] ?? args.index
    else if (token === '--input') args.input = argv[++i] ?? args.input
    else if (token === '--help' || token === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return args
}

function printHelp() {
  console.log(`Sync achievements from Kuro wiki into public/data JSON.

Usage:
  node scripts/sync-kuro-achievements.mjs [options]

Options:
  --source <url>    Source page URL (default: ${DEFAULT_SOURCE_URL})
  --version <ver>   List version to write into output (default: YYYY.MM.DD)
  --output <path>   Output json path (default: public/data/achievements_v{version}.json)
  --index <path>    Index file path (default: ${DEFAULT_INDEX_PATH})
  --input <path>    Read HTML from local file instead of fetching URL
  -h, --help        Show this help
`)
}

function stripTags(input) {
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value, prefix) {
  const normalized = value
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized.length > 0 ? normalized : `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

function extractJsonFromHtml(html) {
  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      return JSON.parse(nextDataMatch[1])
    } catch {
      // continue with other strategies
    }
  }

  const nuxtMatch = html.match(/__NUXT__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/)
  if (nuxtMatch) {
    try {
      return Function(`"use strict";return (${nuxtMatch[1]});`)()
    } catch {
      // continue with other strategies
    }
  }

  return null
}

function pickString(candidate) {
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim()
  }
  return ''
}

function normalizeFromStructuredData(data) {
  const categories = []

  function visit(node, currentCategory) {
    if (!node || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach((entry) => visit(entry, currentCategory))
      return
    }

    const obj = node
    const possibleChildren = [obj.children, obj.items, obj.list, obj.achievements, obj.nodes]

    const name = pickString(obj.name) || pickString(obj.title)
    const description = pickString(obj.description) || pickString(obj.desc) || pickString(obj.content)

    const hasChildren = possibleChildren.some((children) => Array.isArray(children))

    if (name && hasChildren && !description) {
      const cat = {
        id: `cat_${slugify(name, 'cat')}`,
        name,
        items: [],
      }
      categories.push(cat)
      for (const children of possibleChildren) {
        if (Array.isArray(children)) visit(children, cat)
      }
      return
    }

    if (name && description && currentCategory) {
      currentCategory.items.push({
        id: `achv_${slugify(name, 'achv')}`,
        name,
        description,
      })
      return
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        visit(value, currentCategory)
      }
    }
  }

  visit(data, null)
  return categories.filter((cat) => cat.items.length > 0)
}

function normalizeFromHtml(html) {
  const categories = []
  const headingRegex = /<(h2|h3|h4)[^>]*>([\s\S]*?)<\/\1>/gi
  const headings = [...html.matchAll(headingRegex)]

  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i]
    const start = heading.index + heading[0].length
    const end = i + 1 < headings.length ? headings[i + 1].index : html.length
    const section = html.slice(start, end)
    const categoryName = stripTags(heading[2])

    if (!categoryName) continue

    const rows = [...section.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    const items = rows
      .map((row) => stripTags(row[1]))
      .map((line) => {
        const separatorIndex = line.search(/[：:]/)
        if (separatorIndex === -1) {
          return {
            name: line,
            description: 'No description from source content.',
          }
        }

        return {
          name: line.slice(0, separatorIndex).trim(),
          description: line.slice(separatorIndex + 1).trim() || 'No description from source content.',
        }
      })
      .filter((item) => item.name.length > 0)

    if (items.length === 0) continue

    categories.push({
      id: `cat_${slugify(categoryName, 'cat')}`,
      name: categoryName,
      items: items.map((item) => ({
        id: `achv_${slugify(item.name, 'achv')}`,
        name: item.name,
        description: item.description,
      })),
    })
  }

  return categories
}

async function loadHtml(args) {
  if (args.input) {
    return readFile(args.input, 'utf8')
  }

  const response = await fetch(args.source, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; wwticks-bot/1.0)',
      accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`Fetch failed with ${response.status} ${response.statusText}.`)
  }

  return response.text()
}

function buildOutput(version, categories) {
  return {
    version,
    updated_at: new Date().toISOString().slice(0, 10),
    categories,
  }
}

async function updateIndex(indexPath, version) {
  const content = await readFile(indexPath, 'utf8')
  const parsed = JSON.parse(content)
  const versions = Array.isArray(parsed.versions) ? parsed.versions : []
  if (!versions.includes(version)) {
    versions.push(version)
  }

  const next = {
    latest: version,
    versions,
  }

  await writeFile(indexPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const version = args.version || new Date().toISOString().slice(0, 10).replace(/-/g, '.')
  const outputPath = args.output || `${DEFAULT_OUTPUT_DIR}/achievements_v${version}.json`

  const html = await loadHtml(args)
  const structured = extractJsonFromHtml(html)
  const categories = structured ? normalizeFromStructuredData(structured) : []
  const finalCategories = categories.length > 0 ? categories : normalizeFromHtml(html)

  if (finalCategories.length === 0) {
    throw new Error('No achievements parsed from source. Use --input with a saved HTML file to debug parser.')
  }

  const output = buildOutput(version, finalCategories)
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  await updateIndex(args.index, version)

  console.log(`Wrote ${outputPath} with ${finalCategories.length} categories.`)
  console.log(`Updated ${args.index} (latest=${version}).`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
