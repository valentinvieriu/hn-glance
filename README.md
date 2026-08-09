# HN Glance

HN Glance is a visual Hacker News reader. It keeps Hacker News as the source of truth, but gives readers a more visual way to scan stories, judge links, and read discussions.

Configured Worker URL after the renamed Worker is deployed: https://hn-glance.vv42.workers.dev/

## Why HN Glance Exists

Hacker News is fast and information-dense, but it is also heavily text-based. A title, score, and comment count do not always tell you what you are about to open. Some links are thoughtful essays, papers, or useful technical writeups. Others are thin product pages, ad-heavy landing pages, paywalls, modals, or low-signal posts.

HN Glance adds visual context before the click. Each story card includes a preview of the linked page so you can quickly ask:

- Does this look like a real article, paper, announcement, or discussion starter?
- Is the page readable, substantial, and worth opening?
- Does it look like a marketing page, dark pattern, modal wall, or low-value landing page?
- Do I want the article, the HN discussion, or neither?

The goal is not to replace Hacker News. It is an alternative way to consume the same public HN stories: more visual, easier to scan, and still quick.

HN Glance's discovery feeds intentionally include only submissions with an explicit,
non-empty source URL supplied by Hacker News. Ask HN, jobs, polls, and other
text-only submissions without a linked page are not shown in Top, Best, New, or
Show: without a source page there is nothing meaningful for the visual preview
to evaluate. Their HN item pages can still be opened directly, but HN Glance never
synthesizes an HN discussion permalink to make them eligible for a feed card.

## What It Does

- Shows Top, Best, New, and Show HN feeds.
- Presents each story with a visual page preview, title, source, freshness, author, points, and comment count.
- Opens an HN Glance story page for the card, with metadata, comments, screenshot, exact-source HN history, similar stories, and value-grouped links shared in the discussion.
- Opens the original source from the source/domain link.
- Renders HN comments with safer rich text, nested branches, quote handling, reference links, expand controls, and root-comment sorting by HN order, discussion size, or recent activity.
- Offers an optional discussion focus for deep branches: each column is a sibling set along the selected reading path, while the comment reader can show either the current comment or the complete root-comment-to-current reading path.
- Includes user activity pages for posts and comments.
- Supports responsive layouts and dark mode.
- Avoids analytics and marketing cookies.

## Product Philosophy

HN Glance treats each story as something to evaluate visually before reading. The screenshot is not decoration; it is the main browsing affordance.

The card model is intentionally simple:

- The preview helps you judge the linked page.
- The title confirms what the story is.
- The source and timestamp orient you.
- The score and comments provide HN context.
- The card opens the HN Glance story page.
- The source link opens the external article.

This keeps the browsing flow direct: scan, compare, open, or move on.

The loop continues through two distinct decisions:

- **Feed discovery:** Which linked story deserves attention?
- **Story overview:** Where does that story's value appear to be: in the
  submitted source, the HN discussion, or resources introduced by the
  discussion?

Those paths are intentionally asymmetric. The source preview is an inspection
surface that helps a reader decide whether to open the publisher's page. Links
from the discussion form an index into external resources and the comments that
introduced them. The HN discussion is the sustained reading surface HN Glance
can present end to end while preserving HN ordering, authorship, and reply
context.

The overview remains the default, including its familiar nested comment tree.
When a discussion becomes too deep to scan comfortably through indentation,
the optional discussion focus projects that same already-loaded tree into
Miller columns: root comments first, then one sibling set for each selected
reply level, with the complete current comment in a fixed comment reader. Its
optional Reading path mode renders every ancestor in full, opens at the current
comment so the argument can be read upward, and provides Go to root comment and
Go to current comment jumps. Compact source previews reuse the same extracted-link
and favicon identity used by From the Discussion; they do not fetch page metadata.
Each reader entry shows only links in that exact comment, while the overview's
From the Discussion index remains the story-wide aggregate.
Compact row excerpts are navigation labels, not a second comment dataset.
Entry, exit, deep links, and browser history retain both the current comment
and reader mode while the overview preserves its own disclosure state.

This deeper presentation helps readers focus on the discussion without turning
HN Glance into an article-rehosting service or a second comments product. It
reuses the existing story and comment model and leaves original sources clearly
reachable. In compact form: **discover visually, evaluate together, focus on
discussion, and leave for sources.**

Typography supports the same transition: once a reader commits to a story
page, comments and story prose switch to a dedicated reading voice so long
discussions stay comfortable while the interface keeps its own character.

The responsive layout follows that same split. Visual discovery surfaces use
available width to show more screenshots at a useful size, while story text,
comments, profiles, and policy copy retain bounded reading measures. Shared
fluid gutters align the app shell and keep content away from the viewport edge.

## Product Language System

HN Glance should sound like one product across the overview, discussion focus,
columns, breadcrumbs, comment reader, and accessible labels. The user's mental
model comes before the control: name the entity, the action, and the resulting
state consistently. A term keeps the same meaning wherever it appears, and two
different concepts do not share a convenient but ambiguous label.

The canonical discussion vocabulary is:

- **Discussion:** the complete comment tree for one story.
- **Root comment:** a comment with no parent. The first column and the start of
  every reading path contain root comments.
- **Reply:** a direct child of another comment. Use **direct reply** when the
  distinction from all descendants matters.
- **Branch:** a comment and its descendants. Branch counts should say whether
  they count replies or include the branch's starting comment.
- **Reading path:** the ordered sequence from one root comment to the current
  comment, inclusive.
- **Current comment:** the comment selected in the columns and displayed in the
  comment reader.
- **Parent comment:** the current comment's direct parent.

Do not use **conversation**, **thread**, **top-level thread**, and **root
comment** as interchangeable UI labels. “Conversation Browser” may describe
the internal Miller-column pattern, but the interface should name the actual
discussion entities. Interactive labels use the complete entity name—such as
**Root comments**, **Parent comment**, and **Root comment**—instead of relying
on an isolated **Root** or **Parent** to change meaning by location.

Presentation terms form a separate hierarchy:

- **Story overview:** the default comparison surface.
- **Discussion focus:** the full-viewport presentation of the same loaded
  discussion.
- **Comment reader:** the reading surface beside or below the columns.
- **Reading mode:** the comment reader's presentation choice between **Current
  comment** and **Reading path**.

Mode switches must have a visible category label, parallel option labels, a
clear selected state, and matching accessible state. Counts must name what they
count and should not repeat another visible metric without adding meaning.
Navigation labels should also name their target: **Previous reply** and **Next
reply** within a reply set, or **Previous root comment** and **Next root
comment** in the root-comment set.

Repeated product terms, mode names, navigation actions, counts, and their
accessible equivalents belong to one central, key-based product-language
catalog. Its immediate purpose is consistency: change a product term once and
apply that decision across every surface without hunting for inline variants.
This adopts the useful part of an i18n system before translation is a product
need; it does not claim that HN Glance is localized today.

Keys are semantic—based on concepts such as root comment, reading path, and
focus discussion—not visual locations such as left button or first tab.
Dynamic labels use shared formatters so pluralization and context cannot drift
between components. Long-form page prose and story content remain ordinary
content; the catalog governs reusable interface language rather than forcing
every sentence into a key-value system.

The English-first typed catalog lives in
`shared/utils/productLanguage.ts`. Discussion components consume its semantic
terms, actions, states, accessible labels, and complete dynamic formatters
directly; they do not maintain parallel inline variants.

Language changes are whole-interaction changes. When a term changes, update its
visible label, accessible name, tooltip, count formatter, tests, and product
documentation together.

## State Experience Strategy

Remembered state should help a reader resume without making the interface
surprising. The product contract is:

- A copied discussion link opens the same comment and reading mode for every
  reader.
- An explicitly chosen reading-mode preference carries to the next discussion
  and browser restart unless an opened link specifies another mode.
- Back and Forward restore the state of that history entry instead of applying
  a newer choice retroactively.
- Returning to a feed in the same tab restores browsing context without
  creating a permanent browsing history.
- Revisit awareness may survive browser restarts, but remains bounded,
  expiring, transparent, and separate from interface preferences.
- Missing, blocked, corrupt, or full browser storage never prevents reading.

State is classified by that expected lifetime before an implementation API is
chosen:

| User expectation | State class | Lifetime |
| --- | --- | --- |
| “This link opens what I see” | Shareable navigation | Copied links and browser history |
| “Back returns this page to how it was” | Per-entry presentation | One history entry |
| “Take me back to my place in this feed” | Session continuity | Current browser-tab session |
| “Use my chosen reading mode next time” | Durable preference | Across stories and browser restarts |
| “Show what changed since my last visit” | Bounded revisit memory | Across visits, never indefinitely |

An explicit URL value overrides a stored preference, which overrides the
product default. Focused discussion URLs must therefore encode both reading
modes explicitly before a reading-mode preference becomes durable; otherwise
the same shared URL could open differently for different readers. The
engineering constraints that preserve this strategy are defined in
`AGENTS.md`; concrete state APIs and storage schemas are intentionally deferred
to implementation design.

## Look and Feel

HN Glance should feel like a modern reader application: current, calm, and a
little warm. It is not a newspaper, not a magazine, not a dense text-first HN
clone, and not a design-forward trend piece chasing interface fashion.

The identity comes from the app shell: light and dark surfaces, seeded color
palettes, rounded cards, and compact sans-serif chrome. Typography encodes the
product model with two voices:

- Source Sans 3 is the interface voice. Navigation, titles, metadata, buttons,
  and everything clickable orients the user quickly.
- Source Serif 4 is the reading voice. Comment bodies, quoted text, and story
  prose signal "settle in and read" the way dedicated reader modes do.

The serif appears only at body size inside reading surfaces. It is texture,
not a statement. These guardrails keep the app out of print and editorial
territory:

- No serif above body size. Headings, story titles, section titles, and
  navigation stay sans-serif.
- No serif in interactive elements.
- Text stays ragged-right; columns are never justified.
- Keep the colorful seeded palettes. Monochrome-on-cream is the print look the
  app must not drift toward.
- Blockquotes stay small-scale quote styling inside comments; they must not
  grow into magazine pull quotes.

When adding UI, default to the sans interface voice and reserve the serif for
content a user reads for more than a moment.

## Tech Stack

- Nuxt 4 / Vue 3 / Nitro
- TailwindCSS
- TypeScript
- Lucide icons
- Cloudflare Workers with Workers Static Assets
- npm with `package-lock.json`

## Getting Started

Requirements:

- Node.js 22.12.0 or newer compatible with Nuxt 4
- npm

Install dependencies:

```bash
git clone https://github.com/valentinvieriu/hn-glance.git
cd hn-glance
npm install
```

Start the development server:

```bash
npm run dev
```

Nuxt usually serves the app at `http://localhost:3000`, but it may choose another port if that one is already in use.

## Useful Commands

```bash
npm run dev          # Start local development
npm run build        # Build for production
npm run typecheck    # Check Vue, Nuxt, and server TypeScript
npm test             # Run unit tests
npm run check        # Run type checking, tests, and production build
npm run preview      # Build and preview with Wrangler
npm run deploy       # Build and deploy to Cloudflare Workers
npm run cf-typegen   # Generate Cloudflare Worker types
npm run build:screenshot-agent       # Type-check and bundle the pull consumer
npm run cf:screenshots:bootstrap   # Create screenshot buckets/lifecycle rule
npm run cf:screenshots:jobs:bootstrap # Create Queue, DLQ, and pull consumer
npm run cf:screenshots:scheduler:deploy # Deploy scheduler and Cron trigger
npm run cf:screenshots:scheduler:dry-run # Validate scheduler Worker bundle
```

Use `npm run check` as the baseline check before shipping changes.

## Project Structure

- `app/pages/`: feed pages, story detail pages, and user activity pages.
- `app/components/story/`: story grid, visual story card UI, and the shared generated screenshot fallback.
- `app/components/comment/`: the default nested comment tree, shared rich comment content, and the discussion-focus Miller-column projection.
- `shared/utils/productLanguage.ts`: typed semantic UI language shared by discussion surfaces, including contextual labels and pluralized counts.
- `server/api/`: feed, item, related-story, user, and screenshot APIs.
- `server/api/internal/screenshot-jobs/`: authenticated capture-agent API.
- `server/utils/screenshot/`: HN source policy, R2 state, result validation, and agent authentication.
- `workers/screenshot-scheduler/`: Cron Worker that admits current feed stories to Cloudflare Queues.
- `capture-agent/`: stateless Queue pull consumer and container image.
- `server/utils/feed.ts`: shared ordered-feed handler and short Nitro SWR data cache for the four HN feeds.
- `server/utils/userActivityHandler.ts`: shared wrapper for paginated user activity routes.
- `server/plugins/earlyHints.ts`: promotes the small set of explicit SSR
  preload/preconnect tags to an HTTP `Link` header for Cloudflare Early Hints.
- `server/plugins/removeInlinedStylesheets.ts`: removes duplicate Nuxt stylesheet links after SSR has inlined the same critical CSS.
- `app/composables/`: shared client logic such as story loading and sanitization.
- `app/utils/storyScreenshotObserver.ts`: shared feed-card screenshot preload observer.
- `app/assets/css/main.css`: global typography and rich-text styling.
- Typography uses Source Sans 3 for the interface and Source Serif 4 for
  comments, quoted text, and story prose, with self-hosted variable weights.
- `app/assets/css/main.css` also owns the shared fluid layout frame, page
  gutters, visual-grid gaps, and reading measure used across the app shell.
- `shared/types/index.ts`: story, comment, user, and activity types shared by the app and server.
- `shared/utils/`: framework-neutral HN paths, dates, screenshot paths, timing, comment-tree analysis, and comment-link extraction.
- `wrangler.toml`: Cloudflare Workers deployment config.

## Deployment

HN Glance deploys to Cloudflare Workers, not Cloudflare Pages.

The renamed Worker is configured to deploy at:

```text
https://hn-glance.vv42.workers.dev/
```

The app and scheduler Workers are named `hn-glance` and
`hn-glance-screenshot-scheduler`, and both use the shared
`hn-glance-screenshots` R2 bucket. The Queue and DLQ are named
`hn-glance-screenshot-jobs` and `hn-glance-screenshot-jobs-dlq`. The
`HN_GLANCE_SCREENSHOT_AGENT_TOKEN` secret, remaining `HN_GLANCE_*` environment
variables, and `X-HN-*` diagnostic headers are stable internal contracts.

The Worker entry and static asset output are configured in `wrangler.toml`:

- Worker entry: `.output/server/index.mjs`
- Static assets: `.output/public`
- Screenshot R2 binding: `SCREENSHOTS_BUCKET`
- Front-of-Worker response cache: Wrangler `[cache] enabled = true`, with the
  default version isolation so deployments cannot inherit stale or negative
  static-asset responses

Cloudflare Early Hints must also be enabled for `hnglance.com` under
**Speed > Settings > Content Optimization**. The app keeps SSR HTML `no-store`
and emits an HTTP `Link` header for up to four explicit preload/preconnect tags.
Cloudflare can cache those hints per page URI and send them as a `103` response
before the Worker finishes rendering the final HTML.

Before deployment, use:

```bash
npm run cf:screenshots:bootstrap
npm run cf:screenshots:jobs:bootstrap
npm run build
npm run cf-typegen
npx wrangler deploy --dry-run
npm run cf:screenshots:scheduler:dry-run
```

Initial background-capture setup also requires a shared random agent secret on
the HN Glance Worker, a Queue read/write API token for the HomeLabs agents, and the
queue ID reported by Cloudflare. Deploy the HN Glance Worker after adding
`HN_GLANCE_SCREENSHOT_AGENT_TOKEN`, then run
`npm run cf:screenshots:scheduler:deploy`. The image workflow publishes the
capture agent to `ghcr.io/valentinvieriu/hn-glance-screenshot-agent`.

### Screenshot generation strategy

Screenshots are generated only by the background pipeline:

1. Every three minutes, the scheduler scans the first 100 Top, Best, Show, and
   New stories in that priority order.
2. The scheduler checks the seven-day R2 admission markers under
   `screenshot-jobs/v1/v9/<hn-id>` with bounded Class B HEAD operations. A
   compact `screenshot-scheduler/v1/v9/state.json` object keeps UTC-day and
   rolling-24-hour counters plus the hourly storage snapshot. No D1 database is
   used.
3. Top, Best, and Show candidates are admitted before New candidates. An 8,000
   job UTC-day ceiling is an emergency runaway guard sized for the Workers Paid
   Queue allowance. The normal hard gate is R2: admissions stop when current v9
   storage plus worst-case reservations for the previous 24 hours would reach
   10 GB.
4. Cloudflare Queues leases jobs to stateless HomeLabs pull agents.
5. Prepare performs one metadata-only R2 check. Only a missing or expired
   preview causes HN source resolution, deterministic source-policy filtering,
   and the bounded content probe.
6. The agent captures eligible HTML pages or the first page of PDF documents
   through the narrow local Browserless API and uploads one validated WebP from
   either its direct or server-owned Ladder route. Terminal page/output errors
   are acknowledged; temporary infrastructure errors retry through Queue.
7. The public route performs one R2 read and serves a fresh or stale image, or
   the transparent GIF that exposes the client-rendered wireframe. It never
   starts browser work.

The only image object is
`screenshots/v9/items/<hn-id>/preview-1440x11111-q55.webp`. HN ID is the sole
identity. Captures remain capped at 1440x11111, 16 megapixels, and 2 MB.
The app uses `?profile=v9` as the only cache-busting dimension.

The source policy transforms X/Twitter status URLs through XCancel, sends PDFs
to Browserless at their original source URL for first-page capture, and skips
private targets and responses confidently identified as unsupported non-HTML
content. Redirects discovered by the bounded content probe are validated but do
not replace the requested capture URL; Browserless performs the actual page
navigation. This prevents probe-only anti-bot redirects, such as YouTube being
sent to Google Sorry, from becoming the screenshot target. Publisher support
and direct-versus-Ladder routing belong exclusively to the Browserless
service's `ruleset.yaml`; HN Glance has no publisher blacklist. Blocked, timed-out,
or otherwise inconclusive probes proceed to Browserless, whose bounded capture
contract classifies the target outcome. Successful objects preserve the chosen
source route in R2 metadata and public diagnostic headers.
Skipped and terminally failed stories rely on their existing admission marker;
there is no separate R2 failure object.

Wrangler Workers Caching remains in front of the public Worker. Screenshot
freshness and the active v9 lifecycle are 28 days. Missing screenshots use a
short cache window so a completed background capture becomes visible quickly.

### Screenshot cost envelope

The guardrails target the included usage on Workers Paid and R2 Standard:

- Workers Paid includes one million Queue operations per month. A normal
  message costs one write, one read, and one delete, so the 8,000-job emergency
  ceiling would consume 720,000 base operations in a 30-day month, or 744,000
  in a 31-day month, and leave retry and DLQ headroom.
- R2 Standard includes 10 GB-month, one million Class A operations, and ten
  million Class B operations per month. At the three-minute frequency, checking
  all 400 feed candidates consumes at most 5,952,000 Class B HEADs in a 31-day
  month. The scheduler keeps enough headroom for prepare retries, public GET
  misses, and management operations.
- The scheduler stores admission counters in one compact R2 state object and
  refreshes the exact v9 byte-count with Class A LISTs at most hourly. The first
  run rebuilds missing state from the admission markers once; steady-state
  candidate filtering does not repeatedly list the marker prefix.
- The 10 GB gate reserves the 2 MB maximum for recently admitted jobs. That
  reservation limits admissions to at most 5,000 in a rolling 24-hour window
  even though the separate UTC-day emergency ceiling is 8,000.
- One admission marker PUT, one preview HEAD, and at most one screenshot PUT are
  used per normal job. Successful uploads no longer perform a failure-marker
  delete.
- Public misses perform one R2 GET and return the generated fallback without a
  second metadata lookup.
- Each three-minute run admits at most 200 jobs, with R2 capacity and recent
  worst-case reservations usually constraining throughput before the emergency
  ceiling.

See [R2 pricing](https://developers.cloudflare.com/r2/pricing/) and
[Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/).

The storage bootstrap replaces the bucket lifecycle configuration with exactly
three rules: seven-day multipart abort, 28-day active v9 screenshots, and
seven-day active v9 admission markers:

```bash
npm run cf:screenshots:bootstrap
npm run cf:screenshots:jobs:bootstrap
```

Legacy screenshot objects and lifecycle rules are not recreated. Applying the
bootstrap removes stale lifecycle rules for pre-v9 prefixes.

## Data Sources

HN Glance reads public Hacker News and Algolia-powered HN APIs. Article screenshots are requested from public story URLs and served through the app's screenshot route so they can be cached and reused.

There is no HN login, voting, posting, or private account integration.
