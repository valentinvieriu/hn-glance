# HN Glance Agent Guide

## App Overview

HN Glance is a Nuxt 4 Hacker News reader focused on visual article discovery. It renders top, best, new, and show story feeds, story detail pages with comments and related-story suggestions, user activity pages, and per-story article screenshots.

The app is an older codebase that has been upgraded to Nuxt 4 and now uses the Nuxt 4 `app/` source directory. Keep changes conservative and preserve the existing project shape unless a migration explicitly requires moving files.

## Product Philosophy

HN Glance is an alternative way to browse Hacker News, not a dense text-first clone of Hacker News.

The core product idea is that a story can be evaluated before opening it. HN titles often hide the shape and quality of the linked page: it might be a substantial essay, a paper, a useful announcement, an ad-heavy landing page, a modal wall, or a thin product page. HN Glance exposes that context by giving each story a visual article preview.

The desired browsing loop is:

```text
scan -> compare -> open the HN Glance story page, open the source, or move on
```

The product journey has two decision stages followed by intentionally
asymmetric depth:

```text
Feed discovery: Which linked story deserves attention?
Story overview: Where is the value: source, discussion, or referenced material?
Depth: Focus on the HN discussion, or continue outward to sources.
```

Keep the story overview as the default comparison surface. The source
screenshot is an inspection aid before leaving for the publisher; it is not a
hosted article reader. Links extracted from comments are an index into external
resources and their original discussion context; they are not a parallel
comments or reference-reading surface. The HN discussion is the sustained
reading experience HN Glance can provide end to end, so deeper product
investment should favor discussion readability and navigation.

Do not force equal focus controls onto source, discussion, and references.
The recursive comment tree remains the default story-overview presentation.
The optional discussion-focus presentation may project the same loaded tree
as sibling columns plus a current-comment reader, with compact plain-text row
excerpts used only as navigation labels. Preserve the current comment and the
overview's disclosure state across entry, exit, deep links, and browser history.
Do not introduce a second comment dataset, a focus-only upstream dependency,
article extraction, or content rehosting. This boundary does not forbid future
pagination or performance work within the existing HN discussion experience.

Preserve these product principles:

- Screenshots are central. They are the main evaluation surface, not decorative thumbnails.
- Discovery feeds contain only stories with an explicit, non-empty source URL
  from HN. URL-less Ask HN, jobs, polls, and text-only submissions may remain
  reachable through direct item or user-activity routes, but they do not belong
  in Top, Best, New, or Show cards and must not be made eligible by synthesizing
  an HN item permalink.
- Hacker News metadata should orient the user without overpowering the preview.
- The source/domain link is the explicit external escape; the card/title opens the HN Glance story page.
- Visual variety matters. Story cards should not collapse into a flat text list.
- Comments are a major part of the HN value. Keep nested discussion, quotes, references, and code readable.
- Avoid heavy CTAs or duplicate buttons when they do not represent genuinely different destinations.

## Architecture

HN Glance uses Nuxt pages for the main routes and Nitro server routes for Hacker News, Algolia, related-story, user, and screenshot APIs.

Frontend:

- `app/pages/index.vue`, `app/pages/top.vue`, `app/pages/best.vue`, `app/pages/new.vue`, `app/pages/show.vue`: feed pages (`/` and `/top` both render the top feed without a redirect).
- `app/pages/item/[id].vue`: story detail page with metadata, screenshot, comments, exact-source HN history, and similar stories.
- `app/pages/user/[username].vue`: user profile/activity page with posts and comments.
- `app/components/story/StoryGrid.vue`: feed layout and loading states.
- `app/components/story/StoryCard.vue`: visual story card, source link, screenshot preview, title, and status row.
- `app/components/story/StoryPlaceholderVisual.vue`: shared deterministic wireframe fallback for queued and unavailable screenshots.
- `app/components/comment/CommentThread.vue`: nested comment renderer.
- `app/components/comment/ConversationBrowser.vue`: discussion-focus projection with horizontally expanding sibling columns and a fixed rich comment reader; its supporting column, row, reader, and shared rich-content components live in the same directory.
- `app/components/user/UserCommentCard.vue`: user activity comment card.
- `app/components/SubmissionHistory.vue`: compact exact-source HN timeline that marks the current submission.
- `app/components/RelatedStories.vue`: semantic “Similar Stories” list on detail pages.
- `app/components/CommentLinks.vue`: value-ordered category groups of outbound links extracted from the comment tree, with deep links back to the comments that shared them.
- `app/components/SourceIdentity.vue`: shared favicon-plus-preview identity block used by related-story and comment-link rows.
- `app/components/layout/Header.vue` and `app/components/layout/Footer.vue`: shared shell.

Shared client logic:

- `app/composables/useStories.ts`: feed loading, session-memory cache, and stale refresh state.
- `app/composables/useFeedTheme.ts`: feed-specific labels, routes, and color theme variables.
- `app/composables/useSeedPalette.ts`: deterministic card color palettes.
- `app/composables/useStoryPlaceholder.ts`: non-semantic, story-seeded wireframe layout generation with bounded SVG geometry.
- `app/composables/useSanitizer.ts`: safe rich-text rendering and HN comment post-processing.
- `app/utils/storyScreenshotObserver.ts`: one shared client-side Intersection Observer for card screenshot preloading.
- `app/utils/sourceFavicon.ts`: safe favicon URL derivation for source identity rows.

Server/API:

- `server/api/top.ts`, `best.ts`, `new.ts`, `show.ts`: configure the shared ordered feed handler.
- `server/api/item/[id].ts`: fetch story details and comment tree from Algolia Items API.
- `server/api/related/[id].ts`: lazily build exact-source submission history and semantic story suggestions from one bounded set of concurrent Algolia searches.
- `server/utils/previousSubmissions.ts`: conservative source-URL canonicalization and bounded exact-history selection.
- `server/api/screenshot/[id].ts`: public R2-only screenshot cache layer.
- `server/api/internal/screenshot-jobs/[id]/prepare.post.ts`: authenticated capture-agent eligibility, R2 reuse, and content-probe endpoint.
- `server/api/internal/screenshot-jobs/[id]/result.put.ts`: authenticated bounded-WebP ingestion endpoint.
- `server/utils/screenshot/sourcePolicy.ts`: URL policy for screenshot capture targets, deterministic skips, and bounded content probing.
- `server/utils/screenshot/runtimeConfig.ts`: request-local overlay that maps source-policy and retention `NUXT_SCREENSHOT_*` Cloudflare bindings, including `.dev.vars`, onto screenshot runtime config without mutating Nuxt's shared config object. The v9 image dimensions, quality, and byte ceiling are fixed shared constants rather than environment settings.
- `server/utils/screenshot/types.ts`: screenshot storage, policy, and runtime-config types.
- `server/utils/screenshot/r2Cache.ts`: v9 HN-ID object keys, metadata-only checks, reads, and writes.
- `server/utils/screenshot/validation.ts`: common bounded-WebP ingestion validation.
- `workers/screenshot-scheduler/`: Cron Worker that scans current HN feeds, deduplicates admissions with lightweight R2 markers, and produces Cloudflare Queue jobs.
- `capture-agent/`: stateless Queue HTTP pull consumer and container image for the HomeLabs Browserless service.
- `server/api/user/[username].ts`: user profile from Algolia.
- `server/api/user/[username]/comments.ts` and `stories.ts`: paginated user activity using Algolia search-by-date.
- `server/utils/userActivityHandler.ts`: shared validation, cache, error, and timing wrapper for user activity routes.
- `server/utils/fetchStories.ts`: common Algolia story normalization.
- `server/utils/feed.ts`: fetch ordered story IDs from HN Firebase, hydrate them from Algolia, preserve source order, cache the four feed payloads briefly inside each Nitro isolate, and set feed cache headers.
- `server/plugins/removeInlinedStylesheets.ts`: strip duplicate generated stylesheet links from SSR HTML after Nuxt inlines the same critical CSS, while leaving the client manifest intact.
- `server/plugins/earlyHints.ts`: promote explicit SSR `preload`/`preconnect` tags to the response `Link` header for Cloudflare Early Hints.
- `server/plugins/apiServerTiming.ts`: `Server-Timing` diagnostics for `/api/` responses.
- `server/utils/userActivity.ts`: user activity pagination and mapping.

Types and global styling:

- `shared/types/index.ts`: shared story, comment, user, and activity types used by the Vue app and Nitro server.
- `shared/utils/comments.ts`, `date.ts`, and `hn.ts`: framework-neutral comment analysis, date formatting, and HN identifier/path helpers.
- `shared/utils/productLanguage.ts`: typed, framework-neutral semantic UI language for canonical discussion terms, actions, states, accessibility, and dynamic labels.
- `shared/utils/commentLinks.ts`: bounded, framework-neutral extraction, deduplication, and value-ordered source categorization for outbound links shared in comments.
- `app/assets/css/main.css`: base typography, rich-text rendering, quote/code/reference styles.
- `tailwind.config.ts`: Tailwind app content path, fonts, dark mode, and extended color tokens.

## Data Sources And Caching

HN Glance reads public data only. There is no HN login, voting, posting, or private
account integration.

Primary upstreams are HN Firebase, Algolia HN APIs, Cloudflare Queues, the
authenticated local Browserless API, and XCancel for best-effort public
X/Twitter capture targets.

Feed admission is deliberately narrower than HN's own feeds. `fetchStories`
must discard Algolia story hits whose `url` is missing or blank before mapping
them into cards. Keep the original source URL intact; do not replace a missing
source with `https://news.ycombinator.com/item?id=...`. Direct item pages can
still render HN-native discussions when addressed explicitly.

Caching expectations:

- Preserve the existing feed/item cache headers and per-isolate feed SWR cache.
- Keep `features.inlineStyles` paired with
  `removeInlinedStylesheets.ts`.
- Keep `earlyHints.ts` paired with Cloudflare Early Hints on the production
  zone. It may promote only explicit SSR `preload` and `preconnect` tags to the
  response `Link` header, with a small bounded hint budget; do not turn Nuxt's
  route-prefetch or modulepreload list into Early Hints.
- Wrangler Workers Caching is the front-of-Worker screenshot cache. Do not
  reintroduce `caches.default` on `workers.dev`.
- The only active preview key is
  `screenshots/v9/items/<hn-id>/preview-1440x11111-q55.webp`.
- Feed cards, details, and social metadata share
  `/api/screenshot/:id?profile=v9`. Legacy variants serve the same object.
- The public route performs one R2 GET and never fetches HN or invokes capture.
- Prepare performs one metadata-only R2 HEAD. Only a missing or stale preview
  proceeds to HN resolution, source policy, and content probing.
- Transparent GIF/SVG fallbacks and failure markers are never stored.
  Terminal page/output failures are acknowledged and the seven-day admission
  marker suppresses immediate re-admission. Infrastructure failures retry via
  Queue.
- Source policy skips unsafe URLs, private redirects, and content confidently
  identified as unsupported non-HTML. It transforms X/Twitter statuses through
  XCancel and sends PDFs at their original source URL to Browserless for
  first-page capture. Redirects are followed only to validate their safety and
  content; the probe must return the requested capture URL rather than a
  redirect target, because probe-specific anti-bot redirects can differ from
  Browserless navigation. It has no publisher blacklist: blocked, timed-out,
  and otherwise inconclusive probes proceed to the trusted Browserless service,
  whose `ruleset.yaml` owns publisher support and direct-versus-Ladder routing.
- Active v9 screenshots expire after 28 days. Keep response TTLs within the
  remaining R2 freshness window.
- The scheduler runs every three minutes and prioritizes Top, Best, and Show
  before New. It checks at most 400 seven-day admission markers with bounded
  Class B HEADs rather than repeatedly listing the marker prefix. Its 8,000-job
  UTC-day ceiling is an emergency runaway guard for the Workers Paid Queue
  allowance, not a pacing target; the 2 MB reservations and 10 GB storage gate
  limit the rolling 24-hour window to at most 5,000 admissions first.
- Keep the compact `screenshot-scheduler/v1/v9/state.json` counter and storage
  snapshot. A missing or invalid state is rebuilt once from admission and image
  LISTs; after that only the exact image byte count is refreshed at most hourly.
- Keep seven-day `screenshot-jobs/v1/v9/` admission markers. They avoid repeated
  Queue and R2 work for recurring, skipped, and terminally failed stories.

## UI And Interaction Principles

Story cards are the core product surface.

- The screenshot/preview should remain visually dominant.
- Source and age should orient the user quickly.
- Title should confirm the preview, not replace it as the only evaluation signal.
- Author, points, and comments are status/context, not primary action buttons.
- Card/title should route to `/item/:id`.
- Source/domain should open the external URL.
- Author should route to `/user/:username`.
- Comment count can route to the story page or a comments anchor if one is added.

On mobile, avoid interactions where the screenshot preview fights page scroll. Prefer simple, robust scrolling behavior over clever nested gesture handling.

For visual work:

- Preserve the colorful seeded card/feed palette system.
- Use existing Tailwind utilities, scoped component CSS, and CSS custom properties before adding new styling systems.
- Keep UI text compact and functional.
- Avoid turning HN Glance into a marketing page or a text-only HN clone.

## Interface Language And Mode Conventions

Use one canonical vocabulary for the comment hierarchy everywhere: visible
copy, accessible labels, tooltips, documentation, tests, and new identifiers.
Architectural metaphors and legacy component names do not define product copy.

| Canonical term | Exact meaning | Copy rules |
| --- | --- | --- |
| Discussion | The complete comment tree for one story | Use for the whole HN discussion, never for one root subtree. |
| Root comment | A comment with no parent | Use **Root comments** for the first column and breadcrumb origin. Use **Root comment** for a navigation target. |
| Reply | A direct child of another comment | Say **direct reply** when distinguishing children from all descendants. |
| Branch | A comment plus its descendants | Counts must state whether they count replies or include the branch's starting comment. |
| Reading path | The ordered root-comment-to-current sequence, inclusive | A count is a number of comments, not replies or depth unless labeled as such. |
| Current comment | The selected comment rendered in the comment reader | Use **Current** only as a compact badge when the surrounding context already says comment. |
| Parent comment | The current comment's direct parent | Interactive labels use the full term rather than an isolated **Parent**. |
| Sibling replies | Replies sharing the same parent | Prefer **Previous reply** and **Next reply** in UI; “sibling” is mainly an implementation term. |

Do not introduce **conversation**, **thread**, **top-level thread**, and **root
comment** as alternative names for the same entity. “Conversation Browser” and
`ConversationBrowser.vue` may remain architecture names for the Miller-column
pattern, but user-facing copy names discussion entities. Use **branch** rather
than **thread** for an arbitrary comment subtree. Legacy component and type
names do not need broad renaming solely to satisfy copy changes.

The discussion UI applies these canonical mappings. Preserve them in new and
changed surfaces:

| Existing or ambiguous copy | Canonical copy |
| --- | --- |
| All conversations / Conversations / top-level threads | Root comments |
| Parent | Parent comment |
| Root | Root comment |
| Comment, when it is a reader-mode option | Current comment |
| Start, when it jumps to the beginning of a reading path | Go to root comment |
| Current, when it jumps within a reading path | Go to current comment |
| Full size, when it enters the focused discussion presentation | Focus discussion |
| Previous / Next | Previous or next reply; at depth one, previous or next root comment |
| `N in thread` for a nested subtree | `N replies in branch` |
| A naked path-count badge such as `3` | `3 comments`, or omit it when **Depth 3** already communicates the same fact |

Keep the presentation hierarchy distinct from the comment hierarchy:

- **Story overview** is the default comparison surface.
- **Discussion focus** is the full-viewport presentation of the same loaded
  discussion. The entry action is **Focus discussion** and the return target is
  **Overview**.
- **Comment reader** is the reading surface next to or below the columns.
- **Reading mode** is the visible category label for switching between
  **Current comment** and **Reading path**.

Mode switches use parallel noun phrases, a visible group label, a strong
selected treatment, and semantic state such as `aria-pressed`. Do not make a
mode switch look like passive metadata. Controls name destinations or outcomes;
badges may use shorter status words only when their context is unambiguous.
Avoid repeating equivalent metrics—reading-path length and comment depth are
the same number under the current root-at-depth-one model.

### Product-language system

`shared/utils/productLanguage.ts` is the central, typed, key-based catalog for
discussion product language. Translation is not the present requirement. The
reason to use the i18n catalog pattern is to make product language a shared
decision: one term can change across visible copy, accessible copy, counts,
tooltips, documentation, and tests without relying on a search for inline text.

The future system must preserve these strategic boundaries:

- keys represent semantic concepts and actions, never component position or
  visual layout;
- repeated headings, controls, modes, navigation, counts, tooltips, and
  accessible names share the catalog;
- complete contextual phrases and pluralization come from the same language
  source rather than being assembled independently in components;
- visible and accessible variants remain connected to one concept even when
  the visible context permits shorter copy;
- one-off explanatory prose, legal copy, story content, authors, and HN comment
  content do not need keys; and
- a terminology change migrates one complete interaction, including tests and
  documentation, so temporary variants do not become new conventions.

This is an English-first consistency system with a path to future localization,
not a claim of current multilingual support and not a reason to abstract every
string. Import the shared catalog rather than introducing component-local
variants for concepts it already owns.

## Browser State Direction

Choose state ownership from user expectations before choosing an API. Do not
put state in `localStorage` merely because persistence is convenient.
This section records the reasons, boundaries, and shared implementation for
state management. New state must join the correct lifetime domain rather than
introducing a component-local storage path.

| State class | Canonical home | Lifetime and examples |
| --- | --- | --- |
| Shareable navigation | URL query or hash | Story sort, discussion focus, explicit reading mode, current comment. Survives copied links and browser history. |
| Per-entry presentation | Vue memory or `history.state` | Scroll geometry, column position, and transient disclosure for the current page/history entry. |
| Same-tab session state | `sessionStorage` | Feed payload cache and per-feed return context. Ends with the browser tab session. |
| Durable preferences | The versioned `hn-glance:preferences` object in `localStorage` | Color-independent UI choices such as reading mode and root-comment order. |
| Durable revisit history | A separate bounded and expiring `localStorage` store | Seen comment identities and story revisit timestamps. Never an unbounded activity log. |

Resolution precedence is **explicit URL state → stored preference → product
default**. Discussion-focus URLs encode both `reader=comment` and `reader=path`,
and story-detail URLs resolve root-comment order to `sort=hn`,
`sort=discussed`, or `sort=recent`. Absence cannot represent an explicit mode
or order because the same shared URL could otherwise resolve differently for
different readers. Leaving discussion focus may remove focus-only query
parameters while retaining the preference for the next entry.

Keep these domains separate because they express different user promises and
require different retention, privacy, and failure behavior:

- app preferences own the durable discussion reader-mode and root-comment-order
  preferences;
- the route owns explicit discussion focus, current-comment identity, sorting,
  and reader mode;
- feed-return state owns same-session story and scroll orientation; and
- discussion-visit state owns bounded comment identities and revisit times.

`shared/utils/appPreferences.ts` owns the versioned schema, defaults,
validation, and serialization. `app/composables/useAppPreferences.ts` is the
only app-owned localStorage boundary and exposes the shared reactive state plus
domain setters. `app/plugins/appPreferences.client.ts` hydrates that state
after mount and accepts same-key storage events. Components must use the
composable rather than reading or writing the storage key directly.

Keep app-owned state versioned, purpose-namespaced, validated, bounded where it
can grow, safe across SSR and hydration, and able to fall back to in-memory
behavior when browser storage is unavailable or invalid. Explicit route state
must not silently overwrite a durable preference merely because a shared link
was opened. Only a user action in the corresponding control changes the
preference. Browser Back and Forward must restore their explicit entry rather
than being overwritten by the latest preference.

Durable revisit state contains only the minimum public identities and
timestamps needed for comparison—never comment bodies, author histories,
external URLs, or a general browsing log. Comment-change detection must be
identity-based; a previous total alone cannot distinguish additions from
deletion or reordering. When revisit memory ships, update the privacy page and
treat cleared, malformed, disabled, and quota-limited storage as expected
fallback cases. Future durable preference fields belong in the same schema and
composable when they share this lifetime and privacy contract; revisit memory
remains a separate bounded store because it has different retention and
data-shape requirements.

## Comment Rendering

HN/Algolia item text arrives as a small HTML subset plus plain-text conventions. Do not flatten comments to plain text unless there is a concrete safety reason; links, paragraphs, emphasis, quotes, and code carry meaning.

Current rendering uses `useSanitizer.ts` to:

- Allowlist safe tags and attributes.
- Restrict links to safe protocols.
- Render through sanitized `v-html`.
- Convert paragraphs beginning with `>` into blockquotes.
- Style reference lines like `[1] - <link>`.
- Link inline markers such as `[1]` to matching references in the same comment.
- Autolink safe bare URLs only when HN/Algolia did not already emit an anchor.
- Style `Edit:`, `Update:`, and `TL;DR:` as note labels.
- Convert plain-text conventions HN never marks up: `*emphasis*`, backtick
  `code` spans, and manual `-`/`1.` lists.

Every comment renders at every depth. `app/pages/item/[id].vue` analyzes the tree once for totals, author activity, descendant counts, latest activity, and reply-disclosure defaults; `CommentThread.vue` uses that shared summary to collapse only deep, large reply branches behind disclosure controls while keeping every comment reachable. Root comments can be reordered with a URL-backed `?sort=` control: HN order (default), most discussed, or recent activity. The selected order is also the durable preference for story-detail pages opened without explicit sort state.

The normal story overview keeps that recursive tree unchanged. Its discussion
focus entry control adds `?view=discussion` and opens
`ConversationBrowser.vue`, which uses the same analysis index and already
loaded comments. Column 1 contains all sorted root comments; every later column
contains the direct replies to the current comment in the preceding column.
The reading path stays highlighted, the URL focus query identifies the current
comment, and the shared `ReaderComment.vue` renderer owns its complete sanitized
body. `ReaderPane.vue` switches between the Current comment and Reading path
reader modes; the latter projects the full root-comment-to-current ancestry as
one rich-text transcript. That mode opens at the current comment, offers Go to
root comment and Go to current comment jumps, and reuses
`CommentLinks.vue` plus `SourceIdentity.vue` for compact link previews; do not
add a second link extractor, favicon implementation, or upstream metadata
request. Reader previews must set non-recursive extraction so each entry shows
only its own links; recursive aggregation belongs only to the story-level From
the Discussion section. Exiting focus restores the normal `#comment-<id>` deep link. On narrow
screens the same model becomes a one-level reader with explicit parent and
direct-reply navigation, or the vertically scrolling reading path, instead of
nested horizontal gestures.

Story detail pages also extract a bounded set of safe HTTP(S) links from the
already-loaded comment tree. `CommentLinks.vue` shows all extracted links in
stable category groups ordered by source value: documentation, papers, code,
reference, news, video, community, social, then other links. Each link carries
its sharing author's seed color and jumps back to the sharing comment, cycling
through comments for multi-mention links. A jump expands only the target's ancestor replies before
focusing and briefly highlighting the comment; do not add a second upstream
request or fetch third-party link metadata for this section.

## Images And Screenshots

Story screenshots render from the canonical `/api/screenshot/:id` URL.
Capture is background-only:

1. Wrangler Workers Caching may satisfy public requests before Worker code.
2. Every three minutes the scheduler scans the first 100 Top, Best, Show, and
   New IDs in that priority order and HEADs the seven-day
   `screenshot-jobs/v1/v9/<story-id>` admissions with at most six concurrent R2
   operations.
3. Before enqueueing, it enforces the 8,000-job emergency UTC-day ceiling and
   projected 10 GB v9 storage ceiling.
4. Queue leases jobs to stateless HomeLabs agents.
5. Prepare performs one preview HEAD, then resolves and probes only a real miss.
6. Browserless output may use its server-owned `direct` or `ladder` route, and
   PDF targets render their first page. Every result must be `ok`/`access_gate`,
   WebP, at most 1440x11111, 16 MP, and 2 MB. The selected route is preserved in
   R2 metadata.
7. The public route serves R2 or the transparent GIF; it never starts capture.

Preserve these guardrails:

- HN ID is the sole v9 identity. Do not add URL hashes, caller-provided URLs, a
  second stored variant, or D1 coordination.
- Keep admission markers; they are the shared suppression mechanism for ready,
  skipped, and terminally failed stories.
- Keep compact scheduler state conditional writes ahead of Queue admission so
  overlapping runs cannot exceed daily or storage reservations. The one-time
  marker LIST is migration/recovery behavior, not the steady-state dedupe path.
- Do not add R2 failure markers. They duplicate admission state and add HEAD,
  PUT, and DELETE operations.
- Network/service/capacity errors retry through Queue. Terminal target/output
  errors are acknowledged immediately and must not block other leases.
- Keep publisher routing in the Browserless ruleset. Do not add an HN Glance host
  blacklist or reject trusted Ladder provenance; that would bypass rules that
  the capture service owns.
- Keep the public route to one bounded R2 GET and prepare to one metadata HEAD
  before source work.
- Keep source links on the original HN URL even when capture uses XCancel; PDF
  capture also uses the original source URL. Content-probe redirects are for
  validation only and must not replace the requested capture URL.
- Preserve the deterministic client wireframe and do not store fallback GIFs or
  SVGs.
- Keep plain `<img>` rendering; do not add image transformations, the old CDN
  URL, or Nuxt Image's Cloudflare provider.
- Do not raise daily admissions, storage ceiling, retention, dimensions,
  quality, or byte limits without recalculating Queue and R2 free-tier usage.
- Feed cards share one Intersection Observer.
- Keep feed cards continuously paintable. Do not add `content-visibility: auto`
  to `StoryCard`; Chromium can flash the filtered screenshot layers while
  scrolling. Screenshot request deferral remains owned by the shared observer.
- Use `CF-Cache-Status`, `X-HN-Screenshot-Cache`, and
  `X-HN-Screenshot-Source-Route` for diagnostics. Agent stdout must retain
  structured skip reasons and terminal outcome/route/hostname details; do not
  add storage-backed failure records for observability.

## Styling, Linting, And Code Style

Styling approach:

- TailwindCSS is the base styling system.
- Component-specific CSS generally lives in scoped Vue styles.
- Shared typography/rich-text styling belongs in `app/assets/css/main.css`.
- Use the shared `layout-frame` and `--layout-*` tokens in `main.css` for
  page-level width, gutters, and spacing. Header, feed, detail, user, and footer
  content should share this outer frame; keep prose constrained separately with
  `reading-measure` rather than introducing one-off page containers.
- Give the full frame to visual comparison surfaces such as screenshot grids
  and large source previews. Use `layout-content` or `reading-measure` for
  reading-heavy sections so wider screens improve scanning without producing
  long, tiring text lines.
- Dark mode uses `@nuxtjs/color-mode` with class-based Tailwind dark mode.
- Fonts are Source Sans 3 for interface text and Source Serif 4 for reading
  surfaces such as comments, quoted text, and story prose. Both use downloaded
  variable weight ranges so intermediate weights remain genuine font instances.
- Typography is two voices with a hard boundary. The serif reading voice
  appears only at body size inside reading surfaces; headings, story titles,
  section titles, navigation, and interactive elements stay sans-serif. Keep
  text ragged-right, never justified, and keep blockquotes small-scale quote
  styling rather than magazine pull quotes. HN Glance should read as a modern
  reader app, never as a newspaper, magazine, or editorial layout; the
  colorful seeded palettes are part of that anti-print identity.
- Google Font faces are self-hosted and injected into Nuxt's hashed CSS with `font-display: optional`; do not restore the separate `/css/nuxt-google-fonts.css` render-blocking link.
- Keep the `nitro:config` public-asset filter paired with the Google Fonts
  module. Vite already emits the active faces as hashed assets; copying the
  module cache would also ship unreferenced files from superseded font families.
- Prefer the existing feed theme and seed palette helpers over one-off color systems.

Linting and checks:

- There is currently no dedicated `lint` script in `package.json`.
- Use `npm run check` as the baseline verification; it runs type checking, unit tests, and the production build.
- Use `git diff --check` for whitespace issues when editing docs or code.

Code conventions:

- Follow nearby file style instead of reformatting broad areas.
- Keep dependency and lockfile changes intentional.
- Avoid broad refactors unless the requested change genuinely requires them.
- Add comments only where they clarify non-obvious behavior.

## Cloudflare Deployment

This app deploys to Cloudflare Workers, not Cloudflare Pages.

Configured production app URL after the renamed Worker is deployed: `https://hn-glance.vv42.workers.dev/`.

- Nuxt/Nitro preset: `cloudflare-module`
- Worker entry: `.output/server/index.mjs`
- Static assets: `.output/public`
- Wrangler command: `wrangler deploy`
- Keep `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml`.
- Enable Cloudflare Early Hints for `hnglance.com` under
  **Speed > Settings > Content Optimization** so the SSR `Link` response header
  can be served as a cached `103` response.
- Keep the R2 binding `SCREENSHOTS_BUCKET` in `wrangler.toml`.
- Keep the `hn-glance-screenshots` R2 bucket, the
  `hn-glance-screenshot-scheduler` Worker, `hn-glance-screenshot-jobs` Queue,
  `hn-glance-screenshot-jobs-dlq` DLQ, the
  `HN_GLANCE_SCREENSHOT_AGENT_TOKEN` secret, remaining `HN_GLANCE_*` environment
  variables, and `X-HN-*` diagnostic headers stable; they are infrastructure
  contracts retained after the migration.
- Keep Wrangler Workers Caching enabled, but preserve its default
  version-isolated cache. Do not enable `cross_version_cache` without a
  Worker-scoped deployment purge or equivalent versioned invalidation:
  cross-version reuse can retain cached negative responses for immutable Nuxt
  assets. Keep SSR page routes explicitly `no-store`; uncategorized successful
  responses otherwise receive the platform's default cache TTL.
- R2 must be enabled on the Cloudflare account before bucket creation or deployment verification can succeed.
- Production and local development share the remote R2 bucket `hn-glance-screenshots`; do not add a separate preview bucket without reintroducing cross-environment captures.
- R2 lifecycle should delete active `screenshots/v9/` objects after 28 days and
  `screenshot-jobs/v1/v9/` admission markers after seven days. Bootstrap sets
  exactly those active v9 rules plus the multipart-abort rule, removing legacy
  lifecycle rules rather than recreating them.
- Keep the 8,000-admission emergency UTC-day ceiling, Top/Best/Show/New
  priority, and projected 10 GB storage gate. Every screenshot remains capped
  at 2 MB; admission markers are empty metadata objects.
- Use `npm run cf:screenshots:bootstrap` to create the screenshot R2 bucket and
  enforce the exact active v9 lifecycle policy. Use
  `npm run cf:screenshots:jobs:bootstrap` once to create the Queue, DLQ, and HTTP
  pull consumer.
- Do not switch scripts back to `wrangler pages deploy` or `wrangler pages dev`.

For deployment config changes, verify:

```bash
npm run cf:screenshots:bootstrap
npm run cf:screenshots:jobs:bootstrap
npm run build
npm run cf-typegen
npx wrangler deploy --dry-run
npm run cf:screenshots:scheduler:dry-run
```

## Commands

```bash
npm install
npm run dev
npm run build
npm run build:screenshot-agent
npm run typecheck
npm test
npm run check
npm run preview
npm run deploy
npm run cf-typegen
npm run cf:screenshots:bootstrap
npm run cf:screenshots:jobs:bootstrap
npm run cf:screenshots:scheduler:deploy
npm run cf:screenshots:scheduler:dry-run
npx wrangler deploy --dry-run
git diff --check
```

## Known Caveats

- The background prepare/capture path can be slow on cold misses; public screenshot requests remain bounded R2 reads and fallbacks by default.
- Browser verification should use the in-app browser against `http://localhost:3000` or the actual Nuxt dev port.
- The dev server may need a restart after dependency or Nuxt/Nitro preset changes; hot reload can leave the app shell blank.
- Screenshot latency is expected and should not be treated as a UI regression unless the task is specifically about screenshots.

## Working Conventions

- Work on and push `main` by default. Create or switch to a feature branch only
  when the user explicitly asks for a branch or pull-request workflow; do not
  infer branch creation from a generic publishing workflow.
- Preserve user changes in the worktree. Do not revert unrelated edits.
- Keep edits scoped to the request and the surrounding module.
- Prefer compatibility fixes over broad rewrites.
- For important architectural changes, update `README.md` and `AGENTS.md` in the same change so project documentation and agent guidance stay accurate.
- For UI changes, preserve the screenshot-first product hierarchy.
- For UI changes, verify in the in-app browser when feasible.
- For Cloudflare deployment changes, verify both build and Wrangler dry-run when possible.
