#!/usr/bin/env node
// Search relevance evaluation against a running HN Glance server.
//
//   node scripts/search-eval.mjs [--base http://localhost:3000] [--out file.json]
//   node scripts/search-eval.mjs --compare before.json after.json
//
// Each case prints the top ten results and the server's search time. Objective
// checks (exclusions, phrases, authors, hosts, remembered titles) report pass
// or fail, and any failure sets a non-zero exit code; ranking quality beyond
// them still needs a human read of the listed results.

import { readFileSync, writeFileSync } from 'node:fs'

const TOP = 10

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./u, '')
  } catch {
    return ''
  }
}

const titleMatches = stories => stories.filter(story => story.match === 'title')

const CASES = [
  { query: 'c', note: 'one-letter language' },
  { query: 'OpenAI', note: 'popular topic with clustered comments' },
  { query: 'github.com', note: 'domain' },
  { query: 'sqlite', note: 'evolving topic' },
  { query: 'wasm', range: 'all', note: 'all-time topic' },
  { query: 'rust async', note: 'two-word topic' },
  { query: 'local-first software', note: 'multiword topic' },
  { query: 'kubernetes alternatives for small teams', range: 'all', note: 'long query' },
  { query: 'JavaScript', note: 'capitalization' },
  { query: 'javascript', note: 'capitalization' },
  {
    query: "Postgres isn't slow, your storage is",
    note: 'remembered title',
    check: stories => ({
      pass: stories.slice(0, 3).some(story => /postgres isn.t slow/iu.test(story.title)),
      detail: 'remembered title in top 3',
    }),
  },
  {
    query: '"distributed systems"',
    range: 'all',
    note: 'quoted phrase',
    check: stories => {
      const misses = titleMatches(stories).filter(story => !/distributed systems/iu.test(story.title))
      return { pass: misses.length === 0, detail: `${misses.length} title matches without the phrase` }
    },
  },
  {
    query: 'rust -game',
    range: 'year',
    note: 'exclusion',
    check: stories => {
      const hits = stories.filter(story => /\bgames?\b/iu.test(story.title))
      return { pass: stories.length >= 10 && hits.length === 0, detail: `${hits.length} results mention game; ${stories.length} results (needs 10+)` }
    },
  },
  {
    query: 'by:pg',
    range: 'all',
    note: 'author filter',
    check: stories => {
      const others = stories.filter(story => story.author !== 'pg')
      return { pass: stories.length > 0 && others.length === 0, detail: `${others.length} of ${stories.length} by another author` }
    },
  },
  {
    query: 'show hn zig',
    range: 'year',
    note: 'Show HN filter',
    check: stories => {
      const others = stories.filter(story => !/^show hn/iu.test(story.title))
      return { pass: stories.length > 0 && others.length === 0, detail: `${others.length} of ${stories.length} not Show HN` }
    },
  },
]

const SHARED_CHECKS = {
  domain: (results) => {
    const stories = titleMatches(results['github.com'] ?? [])
    const off = stories.filter(story => {
      const host = hostOf(story.url)
      return host !== 'github.com' && !host.endsWith('.github.com') && !/github\.com/iu.test(story.title)
    })
    return { name: 'github.com title matches are on the host or name it', pass: off.length === 0, detail: `${off.length} off-host` }
  },
  capitalization: (results) => {
    const ids = query => (results[query] ?? []).map(story => story.objectID).join(',')
    return { name: 'JavaScript and javascript return identical results', pass: ids('JavaScript') === ids('javascript'), detail: '' }
  },
  discussionEvidence: (results) => {
    const discussion = Object.values(results).flat().filter(story => story.match === 'discussion')
    const withEvidence = discussion.filter(story => story.comment?.id && story.comment?.snippet)
    return {
      name: 'discussion matches carry a comment link and snippet',
      pass: discussion.length > 0 && withEvidence.length === discussion.length,
      detail: `${withEvidence.length} of ${discussion.length}`,
    }
  },
}

const parseArgs = (argv) => {
  const args = { base: 'http://localhost:3000', out: null, compare: null }

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--base') args.base = argv[++index]
    else if (argv[index] === '--out') args.out = argv[++index]
    else if (argv[index] === '--compare') args.compare = [argv[++index], argv[++index]]
  }

  return args
}

const runSearch = async (base, { query, range }) => {
  const params = new URLSearchParams({ q: query })
  if (range) params.set('range', range)
  const response = await fetch(`${base}/api/search?${params}`)
  const timing = response.headers.get('server-timing')?.match(/(?:^|,)\s*search;dur=([\d.]+)/u)
  const durationMs = timing ? Number(timing[1]) : null

  if (!response.ok) return { status: response.status, durationMs, stories: [] }

  const body = await response.json()
  return { status: response.status, durationMs, partial: body.partial, stories: body.stories }
}

const formatDuration = durationMs => (durationMs === null ? 'n/a' : `${Math.round(durationMs)} ms`)

const formatStory = (story, index) => {
  const tag = story.match === 'discussion' ? 'disc' : 'titl'
  const line = `  ${String(index + 1).padStart(2)}. [${tag}] ${story.points}p ${story.created_at.slice(0, 10)} ${story.title} (${hostOf(story.url)})`
  return story.comment?.snippet ? `${line}\n        “${story.comment.snippet}”` : line
}

const evaluate = async ({ base, out }) => {
  const results = {}
  const report = []
  const durations = []
  let failures = 0

  for (const testCase of CASES) {
    const { status, durationMs, partial, stories } = await runSearch(base, testCase)
    results[testCase.query] = stories
    if (durationMs !== null) durations.push(durationMs)
    const label = `${testCase.query}${testCase.range ? ` [${testCase.range}]` : ''}`
    console.log(`\n■ ${label} — ${testCase.note} — HTTP ${status}, ${stories.length} results${partial ? ', PARTIAL' : ''}, ${formatDuration(durationMs)}`)
    stories.slice(0, TOP).forEach((story, index) => console.log(formatStory(story, index)))

    if (testCase.check) {
      const { pass, detail } = testCase.check(stories)
      if (!pass) failures += 1
      report.push(`${pass ? 'PASS' : 'FAIL'}  ${label}: ${detail}`)
    }
  }

  for (const check of Object.values(SHARED_CHECKS)) {
    const { name, pass, detail } = check(results)
    if (!pass) failures += 1
    report.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`)
  }

  const sorted = durations.toSorted((first, second) => first - second)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  console.log(`\nChecks\n${report.join('\n')}\n\n${failures} failing check(s)`)
  console.log(`Search time: median ${formatDuration(median)}, max ${formatDuration(sorted.at(-1) ?? null)}`)

  if (out) writeFileSync(out, JSON.stringify(results, null, 2))
  if (failures > 0) process.exitCode = 1
}

const compare = ([beforePath, afterPath]) => {
  const before = JSON.parse(readFileSync(beforePath, 'utf8'))
  const after = JSON.parse(readFileSync(afterPath, 'utf8'))

  for (const query of Object.keys(after)) {
    const beforeTop = (before[query] ?? []).slice(0, TOP)
    const afterTop = (after[query] ?? []).slice(0, TOP)
    const beforeIds = new Set(beforeTop.map(story => story.objectID))
    const afterIds = new Set(afterTop.map(story => story.objectID))
    const added = afterTop.filter(story => !beforeIds.has(story.objectID))
    const removed = beforeTop.filter(story => !afterIds.has(story.objectID))
    const kept = afterTop.length - added.length
    console.log(`■ ${query}: ${kept} kept, ${added.length} added, ${removed.length} removed (top ${TOP}: ${beforeTop.length} → ${afterTop.length})`)
    added.forEach(story => console.log(`   + ${story.title}`))
    removed.forEach(story => console.log(`   - ${story.title}`))
  }
}

const args = parseArgs(process.argv.slice(2))

if (args.compare) compare(args.compare)
else await evaluate(args)
