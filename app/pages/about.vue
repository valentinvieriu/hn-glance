<template>
  <div class="about-shell min-h-full text-slate-900 dark:text-slate-100">
    <div class="layout-frame py-10 md:py-14">
      <article class="layout-content about-card">
        <header class="about-hero">
          <div class="about-hero-copy">
            <p class="about-kicker meta-text">About HN Glance</p>
            <h1>See the shape of a story before opening it.</h1>
            <p class="about-intro">
              Hacker News is fast and information-dense, but a title, score, and
              comment count cannot tell you whether the next click is a substantial
              essay, a useful paper, or a thin landing page. HN Glance adds that
              missing visual context.
            </p>

            <div class="decision-loop" aria-label="The HN Glance browsing loop">
              <span>Scan</span>
              <LucideArrowRight aria-hidden="true" />
              <span>Compare</span>
              <LucideArrowRight aria-hidden="true" />
              <span>Open or move on</span>
            </div>
          </div>

          <div class="preview-stack" aria-hidden="true">
            <div class="preview-card preview-card-back">
              <div class="preview-browser-bar">
                <span></span><span></span><span></span>
              </div>
              <div class="preview-lines">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div class="preview-card preview-card-front">
              <div class="preview-browser-bar">
                <span></span><span></span><span></span>
              </div>
              <div class="preview-visual">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="preview-title-lines">
                <span></span><span></span>
              </div>
              <div class="preview-status">
                <span>source</span>
                <span>discussion</span>
              </div>
            </div>
          </div>
        </header>

        <div class="about-body">
          <section class="about-section about-why">
            <div class="section-heading">
              <p class="section-number">01</p>
              <div>
                <p class="section-label">Why it exists</p>
                <h2>A better decision before the click</h2>
              </div>
            </div>
            <p class="section-lede">
              The screenshot is not decoration. It is the main evaluation surface,
              helping you decide what deserves attention before leaving for the
              publisher or committing to a long discussion.
            </p>

            <div class="question-grid">
              <article>
                <LucideScanSearch aria-hidden="true" />
                <h3>What am I opening?</h3>
                <p>An essay, paper, announcement, product page, paywall, or modal wall?</p>
              </article>
              <article>
                <LucideGauge aria-hidden="true" />
                <h3>Is it worth my time?</h3>
                <p>Does the linked page look readable, substantial, and worth exploring?</p>
              </article>
              <article>
                <LucideRoute aria-hidden="true" />
                <h3>Where is the value?</h3>
                <p>In the source, the HN discussion, useful references—or nowhere?</p>
              </article>
            </div>
          </section>

          <section class="about-section journey-section">
            <div class="section-heading">
              <p class="section-number">02</p>
              <div>
                <p class="section-label">The reading journey</p>
                <h2>Discovery first, depth when it earns it</h2>
              </div>
            </div>

            <ol class="journey-grid">
              <li>
                <div class="journey-icon journey-icon-orange">
                  <LucideLayoutGrid aria-hidden="true" />
                </div>
                <p class="journey-step">Stage 1</p>
                <h3>Feed discovery</h3>
                <p>
                  Compare visual previews across Top, Best, New, and Show. HN
                  metadata orients you without overpowering the linked page.
                </p>
              </li>
              <li>
                <div class="journey-icon journey-icon-blue">
                  <LucidePanelTop aria-hidden="true" />
                </div>
                <p class="journey-step">Stage 2</p>
                <h3>Story overview</h3>
                <p>
                  See the source preview beside the complete loaded discussion,
                  exact-source history, similar stories, and links shared in comments.
                </p>
              </li>
              <li>
                <div class="journey-icon journey-icon-green">
                  <LucideMessagesSquare aria-hidden="true" />
                </div>
                <p class="journey-step">Stage 3</p>
                <h3>Discussion depth</h3>
                <p>
                  Read the nested discussion as usual, or enter Discussion focus: a
                  Finder-like column view for moving through sibling replies while the
                  complete current comment remains open beside them.
                </p>
              </li>
            </ol>
          </section>

          <section class="about-section philosophy-section">
            <div class="philosophy-copy">
              <p class="section-label">A deliberate imbalance</p>
              <h2>The source is inspected. The discussion is read.</h2>
              <p>
                HN Glance does not try to give the source, discussion, and referenced
                material identical treatment. They have different jobs.
              </p>
              <p>
                The screenshot helps you evaluate a publisher's page before leaving.
                Links shared in comments form an index back to their original context.
                The HN discussion is the sustained reading experience HN Glance can
                provide end to end while preserving authorship and reply structure.
              </p>
              <p>
                For deeper branches, Discussion focus projects the same already-loaded
                comment tree into Finder-like columns: root comments first, then one
                column of direct replies for each selected level. The current comment
                stays readable beside the columns, while Reading path unfolds every
                ancestor from the root comment to the current one.
              </p>
            </div>

            <div class="principle-list">
              <div>
                <span>Preview</span>
                <p>An inspection aid, never a hosted article reader.</p>
              </div>
              <div>
                <span>Overview</span>
                <p>The default place to compare source, discussion, and references.</p>
              </div>
              <div>
                <span>Discussion</span>
                <p>The complete HN tree, with focused navigation for deeper branches.</p>
              </div>
              <div>
                <span>Source</span>
                <p>The explicit external escape always leads to the original page.</p>
              </div>
            </div>
          </section>

          <section class="about-section ground-rules-section">
            <div class="section-heading">
              <p class="section-number">03</p>
              <div>
                <p class="section-label">Ground rules</p>
                <h2>An alternative view of HN, not a replacement</h2>
              </div>
            </div>

            <div class="ground-rules-grid">
              <article>
                <LucideShieldCheck aria-hidden="true" />
                <div>
                  <h3>Read-only by design</h3>
                  <p>
                    HN Glance uses public Hacker News data. It provides no HN accounts,
                    voting, posting, or access to private data, and uses no analytics or
                    marketing cookies.
                  </p>
                </div>
              </article>
              <article>
                <LucideExternalLink aria-hidden="true" />
                <div>
                  <h3>Sources stay with their publishers</h3>
                  <p>
                    Linked articles are not rehosted and HN Glance does not represent
                    their publishers. Preview cards always preserve the original source.
                  </p>
                </div>
              </article>
              <article>
                <LucideImage aria-hidden="true" />
                <div>
                  <h3>Visual feeds need a source</h3>
                  <p>
                    Discovery feeds include only submissions with a real source URL.
                    URL-less Ask HN, jobs, polls, and text posts remain reachable through
                    direct item or user pages, but there is no page to preview in a feed.
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section class="project-section">
            <div>
              <p class="section-label">Open project</p>
              <h2>Follow the work or start a conversation</h2>
              <p>
                Development is tracked publicly. Use the repository for the code and
                the issue tracker for bug reports, feature ideas, operational concerns,
                or questions about a screenshot preview.
              </p>
            </div>
            <div class="about-links">
              <a
                href="https://github.com/valentinvieriu/hn-glance"
                target="_blank"
                rel="noopener noreferrer"
              >
                Project repository
                <LucideExternalLink aria-hidden="true" />
              </a>
              <a
                href="https://github.com/valentinvieriu/hn-glance/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Contact via issues
                <LucideExternalLink aria-hidden="true" />
              </a>
            </div>
          </section>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  LucideArrowRight,
  LucideExternalLink,
  LucideGauge,
  LucideImage,
  LucideLayoutGrid,
  LucideMessagesSquare,
  LucidePanelTop,
  LucideRoute,
  LucideScanSearch,
  LucideShieldCheck,
} from '@lucide/vue'

useCanonicalUrl('/about')

const title = 'About HN Glance — a visual Hacker News reader'
const description = 'Why HN Glance uses visual source previews to make Hacker News easier to scan, compare, and read without replacing HN or rehosting articles.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterTitle: title,
  twitterDescription: description,
})
</script>

<style scoped>
.about-shell {
  background:
    radial-gradient(circle at 10% -8%, rgb(249 115 22 / 0.13), transparent 32rem),
    radial-gradient(circle at 92% 8%, rgb(14 165 233 / 0.09), transparent 31rem),
    linear-gradient(145deg, rgb(255 255 255), rgb(248 250 252));
}

.dark .about-shell {
  background:
    radial-gradient(circle at 10% -8%, rgb(249 115 22 / 0.16), transparent 32rem),
    radial-gradient(circle at 92% 8%, rgb(14 165 233 / 0.12), transparent 31rem),
    linear-gradient(145deg, rgb(15 23 42), rgb(17 24 39));
}

.about-card {
  overflow: hidden;
  border: 1px solid rgb(226 232 240 / 0.9);
  border-radius: 1.25rem;
  background: rgb(255 255 255 / 0.88);
  box-shadow: 0 24px 64px rgb(51 65 85 / 0.1);
}

.dark .about-card {
  border-color: rgb(51 65 85 / 0.82);
  background: rgb(15 23 42 / 0.74);
  box-shadow: 0 28px 70px rgb(0 0 0 / 0.3);
}

.about-hero {
  display: grid;
  gap: 2.5rem;
  align-items: center;
  min-height: 31rem;
  padding: clamp(1.75rem, 5vw, 4.5rem);
  border-bottom: 1px solid rgb(226 232 240 / 0.9);
  background:
    radial-gradient(circle at 88% 6%, rgb(249 115 22 / 0.16), transparent 26rem),
    linear-gradient(135deg, rgb(255 247 237 / 0.82), transparent 68%);
}

.dark .about-hero {
  border-color: rgb(51 65 85 / 0.82);
  background:
    radial-gradient(circle at 88% 6%, rgb(249 115 22 / 0.18), transparent 26rem),
    linear-gradient(135deg, rgb(67 20 7 / 0.24), transparent 68%);
}

.about-hero-copy {
  position: relative;
  z-index: 1;
}

.about-kicker,
.section-label {
  margin: 0 0 0.75rem;
  color: rgb(194 65 12);
  font-weight: 750;
  letter-spacing: 0.075em;
  text-transform: uppercase;
}

.dark .about-kicker,
.dark .section-label {
  color: rgb(253 186 116);
}

.about-hero h1 {
  max-width: 43rem;
  margin: 0 0 1.25rem;
  font-size: clamp(2.5rem, 5vw, 4.6rem);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 0.98;
}

.about-intro {
  max-width: 44rem;
  margin: 0;
  color: rgb(71 85 105);
  font-size: 1.08rem;
  line-height: 1.75;
}

.dark .about-intro {
  color: rgb(203 213 225);
}

.decision-loop {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.6rem;
  color: rgb(154 52 18);
  font-size: 0.83rem;
  font-weight: 750;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.decision-loop span {
  border: 1px solid rgb(251 146 60 / 0.42);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.68);
  padding: 0.45rem 0.72rem;
}

.decision-loop svg {
  width: 0.95rem;
  height: 0.95rem;
}

.dark .decision-loop {
  color: rgb(254 215 170);
}

.dark .decision-loop span {
  border-color: rgb(249 115 22 / 0.38);
  background: rgb(67 20 7 / 0.3);
}

.preview-stack {
  position: relative;
  min-height: 22rem;
}

.preview-card {
  position: absolute;
  overflow: hidden;
  border: 1px solid rgb(203 213 225 / 0.9);
  border-radius: 1.1rem;
  background: rgb(255 255 255 / 0.94);
  box-shadow: 0 26px 52px rgb(71 85 105 / 0.17);
}

.preview-card-back {
  inset: 1.4rem 1.5rem 1.2rem 3.1rem;
  transform: rotate(6deg);
  background: linear-gradient(145deg, rgb(224 242 254), rgb(240 249 255));
}

.preview-card-front {
  inset: 0 2.8rem 2.8rem 0;
  transform: rotate(-2.5deg);
}

.preview-browser-bar {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  height: 2.3rem;
  padding: 0 0.85rem;
  border-bottom: 1px solid rgb(226 232 240);
  background: rgb(248 250 252 / 0.86);
}

.preview-browser-bar span {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: rgb(203 213 225);
}

.preview-browser-bar span:first-child {
  background: rgb(251 146 60);
}

.preview-visual {
  display: grid;
  grid-template-columns: 1.45fr 0.8fr;
  grid-template-rows: 1fr 1fr;
  gap: 0.55rem;
  height: 12rem;
  padding: 1rem;
  background: linear-gradient(145deg, rgb(255 247 237), rgb(241 245 249));
}

.preview-visual span {
  border-radius: 0.7rem;
  background: linear-gradient(145deg, rgb(251 146 60), rgb(234 88 12));
}

.preview-visual span:first-child {
  grid-row: 1 / 3;
}

.preview-visual span:nth-child(2) {
  background: linear-gradient(145deg, rgb(56 189 248), rgb(14 165 233));
}

.preview-visual span:nth-child(3) {
  background: linear-gradient(145deg, rgb(74 222 128), rgb(22 163 74));
}

.preview-title-lines,
.preview-lines {
  display: grid;
  gap: 0.65rem;
  padding: 1rem;
}

.preview-title-lines span,
.preview-lines span {
  height: 0.65rem;
  border-radius: 999px;
  background: rgb(203 213 225);
}

.preview-title-lines span:first-child,
.preview-lines span:first-child {
  width: 84%;
  background: rgb(71 85 105);
}

.preview-title-lines span:last-child {
  width: 62%;
}

.preview-lines {
  margin-top: 4rem;
}

.preview-lines span:nth-child(2) {
  width: 68%;
}

.preview-lines span:nth-child(3) {
  width: 78%;
}

.preview-status {
  display: flex;
  justify-content: space-between;
  padding: 0 1rem 1rem;
  color: rgb(100 116 139);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.dark .preview-card {
  border-color: rgb(71 85 105);
  background: rgb(30 41 59);
}

.dark .preview-card-back {
  background: linear-gradient(145deg, rgb(12 74 110), rgb(15 23 42));
}

.dark .preview-browser-bar {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.72);
}

.dark .preview-visual {
  background: linear-gradient(145deg, rgb(67 20 7 / 0.45), rgb(15 23 42));
}

.dark .preview-title-lines span,
.dark .preview-lines span {
  background: rgb(71 85 105);
}

.dark .preview-title-lines span:first-child,
.dark .preview-lines span:first-child {
  background: rgb(203 213 225);
}

.about-body {
  display: grid;
}

.about-section,
.project-section {
  padding: clamp(2rem, 5vw, 4.5rem);
}

.about-section + .about-section,
.project-section {
  border-top: 1px solid rgb(226 232 240 / 0.9);
}

.dark .about-section + .about-section,
.dark .project-section {
  border-color: rgb(51 65 85 / 0.82);
}

.section-heading {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.section-number {
  margin: 0.2rem 0 0;
  color: rgb(249 115 22);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.section-label {
  margin-bottom: 0.35rem;
  font-size: 0.72rem;
}

.section-heading h2,
.philosophy-copy h2,
.project-section h2 {
  margin: 0;
  font-size: clamp(1.75rem, 3vw, 2.65rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.1;
}

.section-lede {
  max-width: 46rem;
  margin: 0 0 2rem 2.25rem;
  color: rgb(71 85 105);
  font-size: 1.04rem;
  line-height: 1.7;
}

.dark .section-lede {
  color: rgb(203 213 225);
}

.question-grid,
.journey-grid {
  display: grid;
  gap: 1rem;
}

.question-grid article,
.journey-grid li {
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: rgb(248 250 252 / 0.74);
  padding: 1.4rem;
}

.question-grid svg {
  width: 1.45rem;
  height: 1.45rem;
  margin-bottom: 1.1rem;
  color: rgb(234 88 12);
}

.question-grid h3,
.journey-grid h3,
.ground-rules-grid h3 {
  margin: 0 0 0.45rem;
  font-size: 1.08rem;
}

.question-grid p,
.journey-grid li > p:last-child,
.ground-rules-grid p,
.philosophy-copy > p,
.principle-list p,
.project-section > div:first-child > p:last-child {
  margin: 0;
  color: rgb(71 85 105);
  line-height: 1.65;
}

.dark .question-grid article,
.dark .journey-grid li {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59 / 0.62);
}

.dark .question-grid p,
.dark .journey-grid li > p:last-child,
.dark .ground-rules-grid p,
.dark .philosophy-copy > p,
.dark .principle-list p,
.dark .project-section > div:first-child > p:last-child {
  color: rgb(203 213 225);
}

.journey-grid {
  margin: 2.25rem 0 0;
  padding: 0;
  list-style: none;
}

.journey-grid li {
  position: relative;
}

.journey-icon {
  display: grid;
  width: 2.8rem;
  height: 2.8rem;
  place-items: center;
  margin-bottom: 1.35rem;
  border-radius: 0.8rem;
}

.journey-icon svg {
  width: 1.35rem;
  height: 1.35rem;
}

.journey-icon-orange {
  background: rgb(255 237 213);
  color: rgb(194 65 12);
}

.journey-icon-blue {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.journey-icon-green {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.journey-step {
  margin: 0 0 0.35rem;
  color: rgb(100 116 139);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.dark .journey-icon-orange {
  background: rgb(124 45 18 / 0.44);
  color: rgb(254 215 170);
}

.dark .journey-icon-blue {
  background: rgb(12 74 110 / 0.5);
  color: rgb(186 230 253);
}

.dark .journey-icon-green {
  background: rgb(20 83 45 / 0.48);
  color: rgb(187 247 208);
}

.philosophy-section {
  display: grid;
  gap: 2.5rem;
  background:
    radial-gradient(circle at 100% 0%, rgb(14 165 233 / 0.12), transparent 26rem),
    rgb(15 23 42);
  color: white;
}

.philosophy-copy > p {
  color: rgb(203 213 225);
}

.philosophy-copy > p + p {
  margin-top: 1rem;
}

.philosophy-copy h2 {
  margin-bottom: 1.25rem;
}

.principle-list {
  display: grid;
  gap: 0.7rem;
}

.principle-list > div {
  display: grid;
  gap: 0.3rem;
  border: 1px solid rgb(71 85 105 / 0.78);
  border-radius: 0.85rem;
  background: rgb(30 41 59 / 0.72);
  padding: 1rem 1.1rem;
}

.principle-list span {
  color: rgb(253 186 116);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.principle-list p {
  color: rgb(226 232 240);
}

.ground-rules-grid {
  display: grid;
  gap: 1.1rem;
  margin-top: 2.25rem;
}

.ground-rules-grid article {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: flex-start;
}

.ground-rules-grid article > svg {
  width: 1.35rem;
  height: 1.35rem;
  margin-top: 0.15rem;
  color: rgb(234 88 12);
}

.project-section {
  display: grid;
  gap: 1.75rem;
  align-items: end;
  background:
    radial-gradient(circle at 96% 10%, rgb(249 115 22 / 0.12), transparent 23rem),
    rgb(255 247 237 / 0.62);
}

.project-section h2 {
  max-width: 38rem;
  margin-bottom: 0.9rem;
}

.project-section > div:first-child > p:last-child {
  max-width: 42rem;
}

.dark .project-section {
  background:
    radial-gradient(circle at 96% 10%, rgb(249 115 22 / 0.14), transparent 23rem),
    rgb(67 20 7 / 0.18);
}

.about-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.about-links a {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgb(251 146 60 / 0.52);
  border-radius: 0.7rem;
  background: rgb(255 255 255 / 0.78);
  padding: 0.65rem 0.85rem;
  color: rgb(154 52 18);
  font-weight: 700;
}

.about-links a:hover {
  background: rgb(255 237 213);
}

.about-links svg {
  width: 1rem;
  height: 1rem;
}

.dark .about-links a {
  border-color: rgb(249 115 22 / 0.42);
  background: rgb(67 20 7 / 0.28);
  color: rgb(254 215 170);
}

.dark .about-links a:hover {
  background: rgb(124 45 18 / 0.34);
}

@media (min-width: 48rem) {
  .about-hero {
    grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
  }

  .question-grid,
  .journey-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .philosophy-section {
    grid-template-columns: minmax(0, 1.15fr) minmax(17rem, 0.85fr);
  }

  .ground-rules-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .project-section {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}

@media (max-width: 47.99rem) {
  .about-hero h1 {
    font-size: clamp(2.4rem, 12vw, 3.5rem);
  }

  .preview-stack {
    min-height: 18.5rem;
  }

  .preview-card-back {
    inset: 1rem 0.5rem 0.5rem 2.2rem;
  }

  .preview-card-front {
    inset: 0 1.5rem 1.5rem 0;
  }

  .preview-visual {
    height: 9.5rem;
  }

  .section-lede {
    margin-left: 0;
  }
}
</style>
