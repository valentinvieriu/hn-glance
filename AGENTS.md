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

HN Glance uses Nuxt pages for the main routes and Nitro server routes for Hacker News, Algolia, related-story, search, user, and screenshot APIs.

Frontend:

- `app/pages/top.vue`, `app/pages/best.vue`, `app/pages/new.vue`, `app/pages/show.vue`: feed pages. `top.vue` declares `/` as a route alias, so `/` and `/top` both render the top feed without a redirect.
- `app/pages/item/[id].vue`: story detail page with metadata, screenshot, comments, exact-source HN history, and similar stories.
- `app/pages/search.vue`: `/search` story search. It renders the shared
  `StoryGridLayout` with a search field and URL-backed `q`, `range`, and
  `sort` options; results are SSR-rendered for shared links and `noindex`.
- `app/pages/user/[username].vue`: user profile/activity page with posts and comments; each list is a `useUserActivityFeed` instance rendered through `app/components/user/UserActivityPanel.vue`.
- `app/layouts/default.vue`: the single app shell (header, main, footer, loading indicator) shared by pages and `app/error.vue`; `SiteErrorPage.vue` renders error content and owns error-page SEO.
- `app/components/story/StoryGridLayout.vue`: presentational themed grid shell
  (header, controls slot, skeletons, errors, empty slot, and cards) shared by
  feeds and search.
- `app/components/story/StoryGrid.vue`: feed data, SEO, and preload wrapper around `StoryGridLayout`. Cards render as `LazyStoryCard` with `hydrate-on-visible`, so first load hydrates only cards near the viewport instead of the whole feed in one main-thread task.
- `app/components/story/StoryCard.vue`: visual story card, source link, screenshot preview, title, and status row.
- `app/components/story/StoryPlaceholderVisual.vue`: shared deterministic wireframe fallback for queued and unavailable screenshots.
- `app/components/story/SourceScreenshotPreview.vue`: story-detail source screenshot with bounded retries and the full-size preview dialog.
- `app/components/comment/CommentThread.vue`: nested comment renderer.
- `app/components/comment/ConversationBrowser.vue`: discussion-focus projection with horizontally expanding sibling columns and a fixed rich comment reader; its supporting column, row, reader, reply-list, and shared rich-content components live in the same directory.
- `app/components/user/UserCommentCard.vue`: user activity comment card.
- `app/components/SubmissionHistory.vue`: compact exact-source HN timeline that marks the current submission.
- `app/components/RelatedStories.vue`: semantic “Similar Stories” list on detail pages.
- `app/components/CommentLinks.vue`: value-ordered category groups of outbound links extracted from the comment tree, with deep links back to the comments that shared them.
- `app/components/SourceIdentity.vue`: shared favicon-plus-preview identity block used by related-story and comment-link rows.
- `app/components/StoryContextSectionHeader.vue`: shared icon, heading, and count header for the Similar Stories, HN history, and From the Discussion sections; their list rows share the `story-context-source-*` classes in `main.css`.
- `app/types/commentReader.ts`: comment-reader position types, kept outside `app/components/` so Nuxt does not register a type-only module as a component.
- `app/components/layout/Header.vue` and `app/components/layout/Footer.vue`: shared shell. The header carries an inline search field at `md` and wider (an icon link elsewhere and on `/search`).
- `app/utils/searchShortcut.ts`: the global `/` shortcut. It ignores modified keys, editable targets, and open modals (discussion focus and the screenshot dialog), focuses the first visible `data-search-input` field, and otherwise opens `/search`.

Shared client logic:

- `app/composables/useStories.ts`: feed loading, session-memory cache, and stale refresh state.
- `app/composables/useHumanFetch.ts`: `$fetch` for human-gated routes. It forwards the session cookie during SSR and, in the browser, loads Turnstile only after a verification refusal, verifies once, and retries.
- `app/composables/useFeedTheme.ts`: feed-specific labels, routes, and color theme variables.
- `app/composables/useDiscussionRoute.ts`: story-detail URL state (comment `sort` at every level, `view=discussion` focus, `reader` mode, and current `comment`), preference fill-in for missing query values, and focus entry/exit.
- `app/composables/useCommentDisclosure.ts`: overview reply disclosure plus jump-to-comment (ancestor reveal, scroll, focus, highlight) and `#comment-<id>` hash handling outside focus.
- `app/composables/useNewComments.ts`: per-visit frozen new-comment set, toolbar-dwell acknowledgement, new-comment navigation, and Mark all seen, built on `useDiscussionVisits`.
- `app/composables/usePageSeo.ts`: the one page-metadata entry point (title, description, Open Graph/Twitter mirrors, canonical URL, robots). Site-wide social image tags stay in `app.vue`.
- `app/composables/useSeedPalette.ts`: deterministic card color palettes.
- `app/composables/useStoryPlaceholder.ts`: non-semantic, story-seeded wireframe layout generation with bounded SVG geometry.
- `app/composables/useSanitizer.ts`: safe rich-text rendering and HN comment post-processing.
- `app/utils/storyScreenshotObserver.ts`: one shared client-side Intersection Observer for card screenshot preloading.
- `app/utils/storyCardParallax.ts`: touch-device card screenshot parallax with one shared Intersection Observer, passive scroll listener, resize listener, and batched read-then-write animation frame for all cards.
- `app/utils/sourceFavicon.ts`: safe favicon URL derivation for source identity rows.
- `app/utils/browserStorage.ts`: guarded local/session storage reads, writes, removals, and cross-tab key subscriptions.

Server/API:

- `server/api/top.ts`, `best.ts`, `new.ts`, `show.ts`: configure the shared ordered feed handler.
- `server/api/item/[id].ts`: fetch story details and comment tree from Algolia Items API.
- `server/api/related/[id].ts`: lazily build exact-source submission history and semantic story suggestions from one bounded set of concurrent Algolia searches.
- `server/api/search.ts`: story search route: validation, cache headers, and errors around `searchStories`.
- `server/api/human/verify.post.ts` and `server/utils/humanSession.ts`: Turnstile Siteverify exchange for the signed human-session cookie, and the `requireHumanSession` gate in front of search and story context.
- `server/utils/storySearch.ts`: search orchestration. Text queries run the same four retrieval channels as Similar Stories (title relevance, recent title, full text, and comment-mentioned stories) inside the selected time range, then rank with `rankSearchStories`. A multi-word query with too few complete title matches takes the semantic pass: broad and query-planned retrieval judged by Workers AI. An explicit HTTP(S) URL query instead lists that source's exact-source submissions, largest discussion first.
- `server/utils/queryPlanner.ts`: the semantic pass's query plan. A small Workers AI model splits the query into exact anchors, optional context words, and short alternative names.
- `server/utils/semanticRanking.ts`: the semantic pass's relevance judgments. Clef Flash screens the candidate pool in batches and re-judges the stories that pass one per request.
- `server/utils/storyRetrieval.ts`: Algolia retrieval channels shared by related stories and search. Each channel fails soft with a `failed` flag, within its own time budget, so callers can serve partial results uncached or fail when every channel is down.
- `server/utils/relatedStories.ts`: shared tokenizer, candidate merge, and diversity selection, plus the Similar Stories ranker `rankRelatedStories`.
- `server/utils/searchRanking.ts`: the typed-query ranker `rankSearchStories`, built on those shared helpers with its own matching policy.
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
- `shared/utils/comments.ts`, `date.ts`, and `hn.ts`: framework-neutral comment analysis, date formatting, and HN identifier/path helpers. `hn.ts` also owns the canonical feed list (`HN_FEEDS`), HN Firebase URLs, reply/user URLs, and route query/hash parsing shared by the app, Nitro, the scheduler Worker, and the capture agent.
- `shared/utils/search.ts`: search route contract (query normalization, `range`
  and `sort` values, default omission, URL-query detection, and hour-floored
  range starts) shared by the page, header, and API.
- `shared/utils/url.ts` and `hash.ts`: source display-domain extraction and the FNV-1a seed hash behind palettes and placeholders.
- `shared/utils/productLanguage.ts`: typed, framework-neutral semantic UI language for canonical discussion terms, actions, states, accessibility, and dynamic labels.
- `shared/utils/commentLinks.ts`: bounded, framework-neutral extraction, deduplication, and value-ordered source categorization for outbound links shared in comments.
- `app/assets/css/main.css`: base typography, rich-text rendering, quote/code/reference styles.
- `tailwind.config.ts`: Tailwind app content path, fonts, dark mode, and extended color tokens.

## Data Sources And Caching

HN Glance reads public data only. There is no HN login, voting, posting, or private
account integration.

Primary upstreams are HN Firebase, Algolia HN APIs, Cloudflare Queues, Workers
AI for search's semantic pass, the authenticated local Browserless API, and
XCancel for best-effort public X/Twitter capture targets.

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
  whose `ruleset.yaml` owns publisher support and direct, Ladder, or FlareSolverr
  routing.
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
| Durable preferences | The versioned `hn-glance:preferences` object in `localStorage` | Color-independent UI choices such as reading mode and comment order. |
| Durable revisit history | A separate bounded and expiring `localStorage` store | Seen comment identities and story revisit timestamps. Never an unbounded activity log. |

Resolution precedence is **explicit URL state → stored preference → product
default**. Discussion-focus URLs encode both `reader=comment` and `reader=path`,
and story-detail URLs resolve comment order to `sort=recent`,
`sort=discussed`, or `sort=oldest`; the legacy `sort=hn` value parses as
`oldest`, which is what Algolia's order always was. Absence cannot represent an explicit mode
or order because the same shared URL could otherwise resolve differently for
different readers. Leaving discussion focus may remove focus-only query
parameters while retaining the preference for the next entry.

Keep these domains separate because they express different user promises and
require different retention, privacy, and failure behavior:

- app preferences own the durable discussion reader-mode and comment-order
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
deletion or reordering. `shared/utils/discussionVisits.ts` owns the versioned
30-day schema and whole-story pruning: at most 100 stories, 20,000 total
comment IDs, and 5,000 IDs per story. Oversized stories are not tracked rather
than partially remembered. `app/composables/useDiscussionVisits.ts` is the
separate browser-storage boundary. Treat cleared, malformed, disabled, and
quota-limited storage as expected fallback cases. Future durable preference
fields belong in the preference schema and composable when they share that
lifetime and privacy contract; revisit memory remains separate because it has
different retention and data-shape requirements.

The first visit establishes a baseline without marking existing comments. On a
revisit, freeze the identity difference for that complete page visit. Briefly
viewing the Discussion section, entering Discussion focus, or using new-comment
navigation acknowledges the current IDs for the next visit without clearing
the frozen markers. Only the explicit **Mark all seen** action dismisses them
immediately. New-comment navigation and markers must use the same frozen set in
the overview tree, sibling columns, current-comment reader, and reading path.

## Search

Search extends the feed loop (scan, compare, open) beyond the current feeds;
it is not a text-result clone of hn.algolia.com. Preserve these boundaries:

- Results render as the same `StoryCard` grid and follow feed admission: only
  stories with an explicit source URL, never synthesized HN permalinks.
- Search reuses the Similar Stories retrieval channels and ranking helpers.
  Search matching lives in `searchRanking.ts`; changes to the shared helpers
  in `relatedStories.ts` must keep both the `rankRelatedStories` and
  `rankSearchStories` tests passing.
- The strict pass requires real term matches rather than Algolia's prefix and
  typo matches, so retrieval disables Algolia typo tolerance rather than
  spending candidate slots on them. Each typed word is one term that matches whole or
  through all of its own hyphen, dot, or letter-to-digit parts in order
  (`gpt4` matches GPT-4, never GPT-5); search lowercases before tokenizing, so
  capitalization never changes results. Only long plain words complete as
  prefixes. Short terms such as C and R are kept and retrieved as exact
  words, and search matches raw titles so tags such as `[pdf]` and
  `Show HN` stay searchable.
- A domain term such as `github.com` matches only that host or a genuine
  subdomain, never lookalikes such as `github.community`.
- Titles and comment evidence share one matcher. Adjacency (split-word parts
  and quoted phrases) is checked on the ordered words of the text, repeats and
  stopwords kept; deduplicated token sets only answer membership.
- Discussion-only matches must contain the query in a retrieved comment under
  the same term rules, and in the semantic pass must also pass the relevance
  model, which judges them with that comment. They stay capped, follow title matches under Newest,
  and show "Mentioned in discussion" with a two-line plain-text Algolia
  snippet linking to `/item/:id#comment-<id>`. The snippet is an excerpt, not
  a reading surface. When the first comment page yields too few distinct
  stories, the comment channel reads one more page.
- All terms are required first. A multi-word query with fewer than eight
  complete title matches takes the semantic pass instead of admitting loose
  term matches. Algolia weighs every word equally, so common words ("self
  hosting") drown the defining one ("waf"); the pass fixes retrieval and
  judgment separately:
  - Retrieval: broad `optionalWords` title and full-text searches, plus the
    searches of a query plan from a small Workers AI model (Granite 4.0 H
    Micro). The model writes only anchors and alternatives under a JSON
    schema; context words are the remaining non-stopword query words, derived
    locally because output tokens dominate planner latency. The plan's anchors
    are quoted so they match exactly, its context words are optional, and its
    short alternative names never complete as prefixes. An anchor must be
    copied from the query. The plan and broad searches start
    alongside the strict channels, so the pass adds little latency, and a
    missing or late plan only narrows the pool.
  - Judgment: Clef Flash scores relevance from 0 to 3 for at most 70
    candidates, best-retrieved first. Batches of ten screen the pool; each
    story a batch passes is re-judged alone as soon as its batch returns, up to
    twelve. Large batches are lenient and depend on candidate order, while a
    whole pool of single calls exceeds Workers AI capacity. A failed or late
    refinement keeps screening scores.
  - Ranking: stories scoring at least 1.5 qualify, ahead of discussion-only
    matches, and keep the popularity, recency, and diversity rules. Phrases and
    exclusions still apply.
  `Server-Timing` reports the `plan` and `semantic` steps, and
  `X-HN-Search-Rank` says whether the pass was `applied`, `screened` (refinement
  failed), or `failed`. There is no in-isolate cache for plans or judgments:
  isolates rarely see the same long-tail query twice, so the public
  `/api/search` cache carries repeats.
- The operator vocabulary stays small and conventional: `"exact phrase"`,
  `-word`, `by:username`, and the words `Show HN`. `shared/utils/search.ts`
  parses them into Algolia tags and `advancedSyntax`; ranking enforces
  phrases and exclusions locally, and the page shows each as a removable chip.
  Quoted phrases keep their stopwords, and an exclusion needs a letter, so
  `-1` stays text.
- `scripts/search-eval.mjs` runs a fixed query set against a running server
  with objective checks and reports search time; any failed check sets a
  non-zero exit code. Compare top-ten results before and after ranking
  changes (`--out`, then `--compare`). `storySearch.test.ts` covers
  orchestration: partial and total failures, timeouts, and the semantic pass
  with a stand-in Workers AI binding.
- Exact-source duplicates, keyed by `canonicalizeSubmissionUrl` (ports and
  meaningful parameters such as `ref` preserved), keep their strongest
  submission. Near-identical titles collapse only within one host: different
  sources with the same title remain separate cards because their previews
  can differ.
- Newest orders matches by date before the result limit, so recent stories
  are not cut by relevance first.
- A failed or timed-out retrieval channel is reported, not treated as "no
  match". Each channel's requests share one time budget, so a stalled
  upstream cannot hold usable results. Search and Similar Stories return
  partial results with `Cache-Control: no-store`, and an uncached 502 when
  every channel fails. A failed semantic pass, or a missing `AI` binding, is
  reported the same way: search keeps the complete matches from the wider
  pool and marks them partial. Search also fails when a partial result is
  empty, and flags non-empty partial results so the page says some results
  may be missing.
- The month range equals `SCREENSHOT_RETENTION_DAYS`. Wider ranges show the
  wireframe fallback for older stories honestly; capture is never guaranteed.
- Search never admits or triggers screenshot captures; admission stays
  feed-driven through the scheduler.
- `q`, `range`, and `sort` live in the URL with product defaults omitted.
  Search pages are SSR `no-store` and `noindex`; `/api/search` responses are
  publicly cacheable for five minutes.
- `/` opens search from anywhere except editable fields and open modals.

## Human Verification

Search's semantic pass spends Workers AI capacity, and every search or Similar
Stories cache miss spends several Algolia requests. Both routes require a
Turnstile-verified human session; cached responses never reach the gate.

- `POST /api/human/verify` sends the Turnstile token to Siteverify with
  `HN_GLANCE_TURNSTILE_SECRET`, requires `success`, the `session` action, and a
  hostname from `HN_GLANCE_TURNSTILE_HOSTNAMES`, and then sets the 24-hour
  `HttpOnly` `hn_glance_human` cookie: a random session ID and expiry signed
  with a key derived from the secret. Siteverify failures fail closed.
- `requireHumanSession` refuses `/api/search` and `/api/related/:id` without a
  valid cookie as an uncached 403 with `X-HN-Verification: required`, and
  applies the `HN_GLANCE_HUMAN_RATE_LIMITER` per-session limit (429).
- The browser treats that 403, or a WAF challenge (`cf-mitigated: challenge`),
  as one shared verification: it loads Turnstile on demand with
  `appearance: interaction-only`, verifies, and retries once. Pages never load
  Turnstile up front.
- SSR forwards the cookie. A server render of `/search` without a session
  returns a pending sentinel so the browser verifies and searches after
  hydration; Similar Stories stays client-only.
- The production widget uses pre-clearance, so the same solve sets
  `cf_clearance`. A zone WAF Managed Challenge on `/api/search` and
  `/api/related/` then stops unverified clients at the edge. The Worker gate
  remains authoritative because SSR calls never pass through zone WAF.
- Development builds use Cloudflare's always-passing test sitekey; `.dev.vars`
  pairs it with the test secret and `HN_GLANCE_TURNSTILE_HOSTNAMES=example.com`.
  `scripts/search-eval.mjs` starts its session with the test secret's dummy
  token. Never add `localhost` or `127.0.0.1` to the production hostname list.

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

Every comment renders at every depth. `app/pages/item/[id].vue` analyzes the tree once for totals, author activity, descendant counts, latest activity, and reply-disclosure defaults; `CommentThread.vue` uses that shared summary to collapse only deep, large reply branches behind disclosure controls while keeping every comment reachable. Comments can be reordered with a URL-backed `?sort=` control: recent activity (default), most discussed, or oldest first. `useDiscussionRoute` applies the order at every level of the tree, and the page builds the focus navigation index from that sorted tree, so the overview, focus columns, and sibling navigation share one order. Algolia returns replies oldest-first rather than in HN's ranking, so do not label that order "HN order"; measured against HN's ranking, recent activity and most discussed surface HN's top comments far better. The selected order is also the durable preference for story-detail pages opened without explicit sort state, and discussion focus offers the same control.

The normal story overview keeps that recursive tree unchanged. Its discussion
focus entry control adds `?view=discussion` and opens
`ConversationBrowser.vue`, which uses the same analysis index and already
loaded comments. Column 1 contains all sorted root comments; every later column
contains the direct replies to the current comment in the preceding column.
Arrow keys follow Finder: Up and Down select as they move, so the reader
previews each sibling, Right enters and selects the first reply, and Left
returns to the previous column's selection. Outside the columns, including
with the columns hidden or after clicking reader text, the same keys walk the
tree from the current comment (previous or next reply, first reply, parent
comment); form controls keep their own arrow keys. The columns can be hidden
for reading and keep their selections and scroll positions while hidden.
Reading text keeps a readable line length, so the freed width goes to larger
reader type, and `ReaderReplies.vue` lists the current comment's direct
replies under the reader wherever the reply column is absent: with the columns
hidden and on narrow screens.
The reading path stays highlighted, the URL focus query identifies the current
comment, and the shared `ReaderComment.vue` renderer owns its complete sanitized
body. `ReaderPane.vue` switches between the Current comment and Reading path
reader modes; the latter projects the full root-comment-to-current ancestry as
one rich-text transcript that ends at the current comment, so the reader, the
breadcrumb, and the columns always agree on where the reader is. The path does
not repeat "Replying to" because the previous entry is the parent comment.
On desktop the Reading mode control and path jumps sit in the path bar rather
than in a reader toolbar, and depth is not repeated beside the breadcrumb. The
reader footer offers only previous and next replies, the sibling position, and
Reply on HN; the breadcrumb, the "Replying to" link, and the Left arrow already
reach parent and root comments. Every comment
with replies opens its reply column in every reader mode, even a one-reply
column, so the navigator remains a stable map. That mode opens at the current
comment, offers Go to
root comment and Go to current comment jumps, and reuses
`CommentLinks.vue` plus `SourceIdentity.vue` for compact link previews; do not
add a second link extractor, favicon implementation, or upstream metadata
request. Reader previews must set non-recursive extraction so each entry shows
only its own links; recursive aggregation belongs only to the story-level From
the Discussion section. Exiting focus restores the normal `#comment-<id>` deep link. On narrow
screens the same model becomes a one-level reader with explicit parent and
direct-reply navigation, or the vertically scrolling reading path followed by
the direct replies, instead of nested horizontal gestures.

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
6. Browserless output may use its server-owned `direct`, `ladder`, or
   `flaresolverr` route, and PDF targets render their first page. Every result
   must be `ok`/`access_gate`, WebP, at most 1440x11111, 16 MP, and 2 MB. The
   selected route is preserved in R2 metadata.
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
  errors are acknowledged immediately and must not block other leases. A
  `502:browserless_error` page-script failure gets one retry, then is
  acknowledged on its second attempt; it usually repeats deterministically.
- Keep publisher routing in the Browserless ruleset. Do not add an HN Glance host
  blacklist or reject trusted Ladder or FlareSolverr provenance; that would
  bypass rules that the capture service owns. The shared route allowlist in
  `shared/utils/screenshot.ts` must list every route the service can return.
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
- Feed cards share one Intersection Observer for screenshot preloading and one
  parallax module for touch scrolling; do not add per-card scroll, resize, or
  observer listeners.
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

Production app URL: `https://hnglance.com/`.

- Nuxt/Nitro preset: `cloudflare-module`
- Worker entry: `.output/server/index.mjs`
- Static assets: `.output/public`
- Wrangler command: `wrangler deploy`
- Keep `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml`.
- Keep `workers_dev = false` and `preview_urls = false`. `hnglance.com` is the
  only public entry so zone WAF and bot rules cannot be bypassed; the capture
  agent's `HN_GLANCE_BASE_URL` is `https://hnglance.com`.
- Enable Cloudflare Early Hints for `hnglance.com` under
  **Speed > Settings > Content Optimization** so the SSR `Link` response header
  can be served as a cached `103` response.
- Keep the R2 binding `SCREENSHOTS_BUCKET` in `wrangler.toml`.
- Keep the Workers AI binding `AI` in `wrangler.toml`; search's semantic pass
  uses it. AI bindings always run remotely, including in local development.
- Keep the `HN_GLANCE_TURNSTILE_SECRET` secret, the
  `HN_GLANCE_TURNSTILE_HOSTNAMES` variable, and the
  `HN_GLANCE_HUMAN_RATE_LIMITER` rate-limit binding paired with the
  pre-clearance Turnstile widget whose sitekey is in
  `shared/utils/humanVerification.ts`.
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
