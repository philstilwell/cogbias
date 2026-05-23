import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "data");
const siteDir = path.join(projectRoot, "site");

const siteConfig = JSON.parse(await fs.readFile(path.join(dataDir, "site.json"), "utf8"));
const entries = JSON.parse(await fs.readFile(path.join(dataDir, "biases.json"), "utf8"));

const siteUrl = String(siteConfig.siteUrl || "").trim();
const siteUrlWithSlash = siteUrl ? `${siteUrl.replace(/\/+$/, "")}/` : "";
const taskBySlug = new Map(siteConfig.categories.map((task) => [task.slug, task]));
const taskByName = new Map(siteConfig.categories.map((task) => [task.name, task]));
const patternBySlug = new Map(siteConfig.patterns.map((pattern) => [pattern.slug, pattern]));
const patternByName = new Map(siteConfig.patterns.map((pattern) => [pattern.name, pattern]));
const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
const buildDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const tasks = siteConfig.categories
  .map((task) => ({
    ...task,
    members: entries.filter((entry) => (entry.tasks || []).includes(task.name)),
  }))
  .filter((task) => task.members.length > 0);

const patterns = siteConfig.patterns
  .map((pattern) => ({
    ...pattern,
    members: entries.filter((entry) => (entry.patterns || []).includes(pattern.name)),
  }))
  .filter((pattern) => pattern.members.length > 0);

for (const entry of entries) {
  for (const taskName of entry.tasks || []) {
    if (!taskByName.has(taskName)) {
      throw new Error(`Unknown task "${taskName}" on entry "${entry.slug}".`);
    }
  }

  for (const patternName of entry.patterns || []) {
    if (!patternByName.has(patternName)) {
      throw new Error(`Unknown pattern "${patternName}" on entry "${entry.slug}".`);
    }
  }

  for (const relatedSlug of entry.related || []) {
    if (!entryBySlug.has(relatedSlug)) {
      throw new Error(`Unknown related slug "${relatedSlug}" on entry "${entry.slug}".`);
    }
  }
}

for (const slug of siteConfig.featured || []) {
  if (!entryBySlug.has(slug)) {
    throw new Error(`Featured entry slug "${slug}" does not exist.`);
  }
}

for (const countermove of siteConfig.countermeasures || []) {
  for (const relatedSlug of countermove.relatedBiases || []) {
    if (!entryBySlug.has(relatedSlug)) {
      throw new Error(`Unknown countermove related slug "${relatedSlug}" on "${countermove.slug}".`);
    }
  }
}

const featuredEntries = (siteConfig.featured || []).map((slug) => entryBySlug.get(slug)).filter(Boolean);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pageTitle(title) {
  return title === siteConfig.brandTitle ? title : `${title} | ${siteConfig.brandTitle}`;
}

function absoluteUrlForRoute(routePath) {
  if (!siteUrlWithSlash) return "";
  return new URL(routePath.replace(/^\//, ""), siteUrlWithSlash).href;
}

function renderBreadcrumbs(items = []) {
  if (!items.length) return "";

  return `<div class="breadcrumbs">${items
    .map((item, index) => {
      const separator = index === 0 ? "" : "<span>/</span>";
      const content = item.href
        ? `<a href="${item.href}">${escapeHtml(item.label)}</a>`
        : `<strong>${escapeHtml(item.label)}</strong>`;
      return `${separator}${content}`;
    })
    .join("")}</div>`;
}

function renderHead({ title, description, prefix, routePath }) {
  const absoluteUrl = absoluteUrlForRoute(routePath);
  const canonical = absoluteUrl ? `<link rel="canonical" href="${absoluteUrl}" />` : "";

  return `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageTitle(title))}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="author" content="${escapeHtml(siteConfig.author)}" />
    <meta name="application-name" content="${escapeHtml(siteConfig.siteName)}" />
    <meta name="theme-color" content="#0e2339" />
    ${canonical}
    <link rel="manifest" href="${prefix}site.webmanifest" />
    <link rel="stylesheet" href="${prefix}styles.css" />
    <script defer src="${prefix}app.js"></script>`;
}

function renderNav(prefix, currentId) {
  const navItems = [
    { id: "home", label: "Home", href: `${prefix}` || "./" },
    { id: "biases", label: "All Biases", href: `${prefix}${siteConfig.sectionSlug}/` },
    { id: "categories", label: "Categories", href: `${prefix}categories/` },
    { id: "patterns", label: "Patterns", href: `${prefix}${siteConfig.patternSlug}/` },
    { id: "countermoves", label: "Countermoves", href: `${prefix}countermoves/` },
    { id: "about", label: "About", href: `${prefix}about/` },
  ];

  return `<nav class="top-nav" aria-label="Primary">${navItems
    .map((item) => {
      const ariaCurrent = item.id === currentId ? ' aria-current="page"' : "";
      return `<a href="${item.href}"${ariaCurrent}>${escapeHtml(item.label)}</a>`;
    })
    .join("")}</nav>`;
}

function renderMasthead(prefix, currentId) {
  const searchPath = `${prefix}${siteConfig.sectionSlug}/`;
  const searchLabel = `Search ${siteConfig.entryLabelPlural}`;

  return `
      <header class="masthead">
        <div class="masthead-inner">
          <div class="brand-row">
            <div class="brand-lockup">
              <div class="brand-logo brand-logo-placeholder" aria-hidden="true">${escapeHtml(siteConfig.brandMonogram)}</div>
              <div>
                <p class="brand-kicker">${escapeHtml(siteConfig.brandKicker)}</p>
                <h1 class="brand-title">${escapeHtml(siteConfig.brandTitle)}</h1>
                <p class="brand-subtitle">${escapeHtml(siteConfig.brandSubtitle)}</p>
              </div>
            </div>
            <form class="site-search-form" role="search" action="${searchPath}" method="get">
              <input
                class="site-search-input"
                type="search"
                name="q"
                placeholder="${escapeHtml(searchLabel)}..."
                aria-label="${escapeHtml(searchLabel)}"
                data-site-search-input
              />
              <button class="site-search-button" type="submit">Search</button>
            </form>
          </div>
          ${renderNav(prefix, currentId)}
        </div>
      </header>`;
}

function renderFooter() {
  return `
      <footer class="footer">
        <div class="footer-inner">
          <p class="footer-note">${escapeHtml(siteConfig.sourceAttribution)}</p>
          <p class="footer-note">Source of truth: <code>data/site.json</code>, <code>data/biases.json</code>, and <code>scripts/import_wikipedia_biases.py</code>.</p>
          <p class="footer-note">Last build: ${escapeHtml(buildDate)}. ${escapeHtml(siteConfig.copyrightNotice)}</p>
        </div>
      </footer>`;
}

function renderPage({ title, description, prefix, currentId, breadcrumbs, body, routePath }) {
  return `<!doctype html>
<html lang="en">
  <head>
${renderHead({ title, description, prefix, routePath })}
  </head>
  <body>
    <div class="site-shell">
${renderMasthead(prefix, currentId)}
      <main class="page-wrap">
        ${breadcrumbs ? renderBreadcrumbs(breadcrumbs) : ""}
${body}
      </main>
${renderFooter()}
    </div>
  </body>
</html>
`;
}

function entryTaskObjects(entry) {
  return (entry.tasks || []).map((name) => taskByName.get(name)).filter(Boolean);
}

function entryPatternObjects(entry) {
  return (entry.patterns || []).map((name) => patternByName.get(name)).filter(Boolean);
}

function entryDomains(entry) {
  const domains = new Set(entry.domains || []);
  for (const task of entryTaskObjects(entry)) {
    domains.add(task.name);
  }
  return [...domains];
}

function entryPromptEffort(entry) {
  return entry.effort || (entry.signals ? "Deep dive" : "Catalog entry");
}

function relatedEntriesFor(entry, limit = 6) {
  const scored = entries
    .filter((candidate) => candidate.slug !== entry.slug)
    .map((candidate) => {
      let score = 0;
      const sharedTasks = (candidate.tasks || []).filter((task) => (entry.tasks || []).includes(task));
      const sharedPatterns = (candidate.patterns || []).filter((pattern) => (entry.patterns || []).includes(pattern));
      score += sharedTasks.length * 4;
      score += sharedPatterns.length * 3;
      if ((entry.related || []).includes(candidate.slug)) score += 20;
      if ((candidate.related || []).includes(entry.slug)) score += 10;
      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map((item) => item.candidate);

  const explicit = (entry.related || []).map((slug) => entryBySlug.get(slug)).filter(Boolean);
  const combined = [...explicit, ...scored];
  const seen = new Set();
  return combined.filter((candidate) => {
    if (seen.has(candidate.slug)) return false;
    seen.add(candidate.slug);
    return true;
  }).slice(0, limit);
}

function fallbackSpotIt(entry) {
  const task = entryTaskObjects(entry)[0];
  const pattern = entryPatternObjects(entry)[0];
  return [
    task?.guidingQuestion || "What exactly is the judgment here, and what makes it vulnerable to distortion?",
    pattern?.guidingQuestion || "What intuitive pattern feels persuasive here before the evidence is fully checked?",
    "Compare the current interpretation against the brief source definition before treating the label as settled.",
  ];
}

function fallbackSlowIt(entry) {
  const linkedMoves = (siteConfig.countermeasures || [])
    .filter((countermove) => (countermove.relatedBiases || []).includes(entry.slug))
    .slice(0, 3)
    .map((countermove) => `${countermove.title}: ${countermove.summary}`);

  if (linkedMoves.length) return linkedMoves;

  return [
    "Name the judgment in one sentence before trying to fix it.",
    "Ask what evidence or comparison would be needed to make the call less intuition-heavy.",
    "Run one deliberate countermove instead of trusting the first coherent story.",
  ];
}

function fallbackReframeIt(entry) {
  const task = entryTaskObjects(entry)[0];
  const pattern = entryPatternObjects(entry)[0];
  return [
    `Treat this as a ${(task?.name || "judgment").toLowerCase()} problem first, not as a verdict about character or certainty.`,
    `Ask how the ${(pattern?.name || "current").toLowerCase()} pattern might be shaping the conclusion more than the evidence.`,
    "Move from naming the bias to changing the process that makes the bias easy to reproduce.",
  ];
}

function renderPills(entry) {
  const taskPills = entryTaskObjects(entry)
    .map((task) => `<span class="pill pill-task">${escapeHtml(task.name)}</span>`)
    .join("");
  const patternPills = entryPatternObjects(entry)
    .map((pattern) => `<span class="pill pill-pattern">${escapeHtml(pattern.name)}</span>`)
    .join("");
  const domainPills = (entry.domains || [])
    .slice(0, 2)
    .map((domain) => `<span class="pill">${escapeHtml(domain)}</span>`)
    .join("");
  return `${taskPills}${patternPills}${domainPills}`;
}

function renderBiasCard(entry, prefix = "") {
  return `
          <article
            class="entry-card"
            data-entry-card
            data-name="${escapeHtml(entry.name)}"
            data-aliases="${escapeHtml((entry.aliases || []).join(", "))}"
            data-categories="${escapeHtml((entry.tasks || []).join("||"))}"
            data-patterns="${escapeHtml((entry.patterns || []).join("||"))}"
            data-body="${escapeHtml(
              [
                entry.summary,
                entry.mechanism,
                entry.distortion,
                entry.commonTrigger,
                ...(entry.tasks || []),
                ...(entry.patterns || []),
              ]
                .filter(Boolean)
                .join(" "),
            )}"
          >
            <h3><a href="${prefix}${siteConfig.sectionSlug}/${entry.slug}/">${escapeHtml(entry.name)}</a></h3>
            <p class="card-copy">${escapeHtml(entry.summary)}</p>
            <div class="pill-row">
              ${renderPills(entry)}
            </div>
          </article>`;
}

function renderCategoryCard(task, prefix = "") {
  return `
          <article class="category-card">
            <h3><a href="${prefix}categories/${task.slug}/">${escapeHtml(task.name)}</a></h3>
            <p class="card-copy">${escapeHtml(task.description)}</p>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${task.members.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
            </div>
            <p class="muted">${escapeHtml(task.guidingQuestion)}</p>
          </article>`;
}

function renderPatternCard(pattern, prefix = "") {
  return `
          <article class="category-card">
            <h3><a href="${prefix}${siteConfig.patternSlug}/${pattern.slug}/">${escapeHtml(pattern.name)}</a></h3>
            <p class="card-copy">${escapeHtml(pattern.description)}</p>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${pattern.members.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
            </div>
            <p class="muted">${escapeHtml(pattern.guidingQuestion)}</p>
          </article>`;
}

function renderCountermoveCard(countermove, prefix = "") {
  return `
          <article class="category-card">
            <h3>${escapeHtml(countermove.title)}</h3>
            <p class="card-copy">${escapeHtml(countermove.summary)}</p>
            <ul class="muted">
              ${countermove.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
            </ul>
            <div class="path-link-row">
              ${(countermove.relatedBiases || [])
                .map((slug) => entryBySlug.get(slug))
                .filter(Boolean)
                .map(
                  (entry) =>
                    `<a class="path-link-chip" href="${prefix}${siteConfig.sectionSlug}/${entry.slug}/">${escapeHtml(entry.name)}</a>`,
                )
                .join("")}
            </div>
          </article>`;
}

function renderHomePage() {
  return renderPage({
    title: siteConfig.brandTitle,
    description: siteConfig.brandSubtitle,
    prefix: "",
    currentId: "home",
    routePath: "/",
    body: `
        <section class="hero">
          <div class="hero-panel">
            <h2 class="hero-title">${escapeHtml(siteConfig.heroTitle)}</h2>
            <p class="hero-lead">${escapeHtml(siteConfig.heroLead)}</p>
            <div class="hero-actions">
              <a class="button button-primary" href="${siteConfig.sectionSlug}/">Browse All Biases</a>
              <a class="button button-secondary" href="categories/">Browse Categories</a>
              <a class="button button-secondary" href="${siteConfig.patternSlug}/">Browse Patterns</a>
            </div>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">At A Glance</p>
            <div class="stat-grid">
              <div class="stat-card">
                <span class="stat-value">${entries.length}</span>
                <span class="stat-label">Bias Entries</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${tasks.length}</span>
                <span class="stat-label">Categories</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${patterns.length}</span>
                <span class="stat-label">Patterns</span>
              </div>
            </div>
            <div class="source-callout section-block">
              <h4>Source Note</h4>
              <p class="muted">${escapeHtml(siteConfig.sourceAttribution)}</p>
            </div>
          </aside>
        </section>

        <section class="detail-section section-block">
          <p class="eyebrow">Judgment Before Argument</p>
          <h2 class="section-title">Bias work starts earlier than fallacy work.</h2>
          <p class="section-copy">Many of these distortions fire in prediction, attribution, recall, hiring, planning, and self-report before anyone offers a polished public argument. That is why this site keeps LogFall’s practical teaching feel but shifts the diagnostic center of gravity toward private judgment and debiasing process.</p>
          <div class="two-column section-block">
            <div class="note-panel">
              <h4>Broad coverage first</h4>
              <p class="muted">This version deliberately starts wide. The imported catalog is designed to give the site real reference value immediately, with richer editorial passes layered onto core entries over time.</p>
            </div>
            <div class="note-panel">
              <h4>Images are planned</h4>
              <p class="muted">Illustration slots are already reserved on the detail pages so a future image set can be added without disturbing the layout.</p>
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Featured biases</h2>
              <p class="section-copy">A teaching-first starter selection drawn from the larger imported catalog.</p>
            </div>
            <a class="inline-link" href="${siteConfig.sectionSlug}/">See the full index</a>
          </div>
          <div class="entry-grid">
            ${featuredEntries.map((entry) => renderBiasCard(entry)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Categories</h2>
              <p class="section-copy">These follow the broad task groupings used in the Wikipedia seed taxonomy.</p>
            </div>
            <a class="inline-link" href="categories/">Open categories</a>
          </div>
          <div class="category-grid">
            ${tasks.map((task) => renderCategoryCard(task)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Patterns</h2>
              <p class="section-copy">The pattern layer gives the site a second axis of comparison, similar to how LogFall uses more than one way of organizing related errors.</p>
            </div>
            <a class="inline-link" href="${siteConfig.patternSlug}/">Open patterns</a>
          </div>
          <div class="category-grid">
            ${patterns.map((pattern) => renderPatternCard(pattern)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Countermoves</h2>
              <p class="section-copy">The point is not just to name a distortion, but to change the decision process that keeps reproducing it.</p>
            </div>
            <a class="inline-link" href="countermoves/">See the playbook</a>
          </div>
          <div class="category-grid">
            ${(siteConfig.countermeasures || []).slice(0, 3).map((countermove) => renderCountermoveCard(countermove)).join("")}
          </div>
        </section>`,
  });
}

function renderBiasIndexPage() {
  return renderPage({
    title: "All Biases",
    description: `Search and compare ${siteConfig.entryLabelPlural} by category and pattern.`,
    prefix: "../",
    currentId: "biases",
    routePath: `/${siteConfig.sectionSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "All Biases" },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Index</p>
          <h2 class="detail-title">Searchable bias index</h2>
          <p class="detail-deck">This index stays broad on purpose. Use categories when you know what kind of judgment is failing, and patterns when you suspect the failure mode but not the exact label.</p>
          <div class="note-panel search-panel section-block">
            <div class="search-row search-row-compact">
              <input class="search-input" type="search" placeholder="Search biases, aliases, or summaries..." aria-label="Search biases" data-search-input />
              <select class="search-select" data-category-filter aria-label="Filter by category">
                <option value="">All categories</option>
                ${tasks.map((task) => `<option value="${escapeHtml(task.name)}">${escapeHtml(task.name)}</option>`).join("")}
              </select>
              <select class="search-select" data-pattern-filter aria-label="Filter by pattern">
                <option value="">All patterns</option>
                ${patterns.map((pattern) => `<option value="${escapeHtml(pattern.name)}">${escapeHtml(pattern.name)}</option>`).join("")}
              </select>
              <button class="search-reset" type="button" data-search-reset>Reset</button>
            </div>
            <div class="search-meta">
              <span data-search-count data-search-unit-singular="${escapeHtml(siteConfig.entryLabelSingular)}" data-search-unit-plural="${escapeHtml(siteConfig.entryLabelPlural)}"></span>
            </div>
            <p class="search-empty hidden" data-search-empty>No matching biases yet. Try a broader term or remove one filter.</p>
          </div>
        </section>

        <section class="section-block">
          <div class="entry-grid">
            ${entries.map((entry) => renderBiasCard(entry, "../")).join("")}
          </div>
        </section>`,
  });
}

function renderCategoryIndexPage() {
  return renderPage({
    title: "Categories",
    description: "Browse cognitive biases by the broad judgment task they most commonly distort.",
    prefix: "../",
    currentId: "categories",
    routePath: "/categories/",
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Categories" },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Categories</p>
            <h2 class="detail-title">Six broad kinds of judgment trouble</h2>
            <p class="detail-deck">These category pages track the top-level task groupings from the Wikipedia seed taxonomy, then reframe them for a teaching-first reference site.</p>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">How To Use Them</p>
            <p class="muted">Ask what sort of judgment is failing first. Then compare nearby labels inside that same task family before reaching for a definitive diagnosis.</p>
          </aside>
        </section>

        <section class="section-block">
          <div class="category-grid">
            ${tasks.map((task) => renderCategoryCard(task, "../")).join("")}
          </div>
        </section>`,
  });
}

function renderPatternIndexPage() {
  return renderPage({
    title: "Patterns",
    description: "Browse cognitive biases by recurring distortion pattern.",
    prefix: "../",
    currentId: "patterns",
    routePath: `/${siteConfig.patternSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Patterns" },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Patterns</p>
            <h2 class="detail-title">Five recurring ways judgment slips</h2>
            <p class="detail-deck">The pattern pages are a second axis of comparison. They are especially helpful when several different biases share the same psychological shape even across different categories.</p>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">Why This Helps</p>
            <p class="muted">Patterns surface the hidden resemblance between biases that would look unrelated in a simple alphabetical list.</p>
          </aside>
        </section>

        <section class="section-block">
          <div class="category-grid">
            ${patterns.map((pattern) => renderPatternCard(pattern, "../")).join("")}
          </div>
        </section>`,
  });
}

function renderCategoryDetailPage(task) {
  return renderPage({
    title: task.name,
    description: task.description,
    prefix: "../../",
    currentId: "categories",
    routePath: `/categories/${task.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "Categories", href: "../" },
      { label: task.name },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Category</p>
            <h2 class="detail-title">${escapeHtml(task.name)}</h2>
            <p class="detail-deck">${escapeHtml(task.description)}</p>
            <div class="pill-row">
              <span class="pill pill-task">${task.members.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
            </div>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">Guiding Question</p>
            <p class="muted">${escapeHtml(task.guidingQuestion)}</p>
          </aside>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Biases in this category</h2>
              <p class="section-copy">Use these side by side before deciding which label best fits the judgment failure you are seeing.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${task.members.map((entry) => renderBiasCard(entry, "../../")).join("")}
          </div>
        </section>`,
  });
}

function renderPatternDetailPage(pattern) {
  return renderPage({
    title: pattern.name,
    description: pattern.description,
    prefix: "../../",
    currentId: "patterns",
    routePath: `/${siteConfig.patternSlug}/${pattern.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "Patterns", href: "../" },
      { label: pattern.name },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Pattern</p>
            <h2 class="detail-title">${escapeHtml(pattern.name)}</h2>
            <p class="detail-deck">${escapeHtml(pattern.description)}</p>
            <div class="pill-row">
              <span class="pill pill-pattern">${pattern.members.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
            </div>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">Guiding Question</p>
            <p class="muted">${escapeHtml(pattern.guidingQuestion)}</p>
          </aside>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Biases with this pattern</h2>
              <p class="section-copy">This is the cross-cutting layer that helps the site feel more like a real reference and less like a flat list.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${pattern.members.map((entry) => renderBiasCard(entry, "../../")).join("")}
          </div>
        </section>`,
  });
}

function renderBiasDetailPage(entry) {
  const related = relatedEntriesFor(entry, 6);
  const taskObjects = entryTaskObjects(entry);
  const patternObjects = entryPatternObjects(entry);
  const spotIt = entry.spotIt || fallbackSpotIt(entry);
  const slowIt = entry.slowIt || fallbackSlowIt(entry);
  const reframeIt = entry.reframeIt || fallbackReframeIt(entry);

  return renderPage({
    title: entry.name,
    description: entry.summary,
    prefix: "../../",
    currentId: "biases",
    routePath: `/${siteConfig.sectionSlug}/${entry.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "All Biases", href: "../" },
      { label: entry.name },
    ],
    body: `
        <section class="detail-hero detail-hero-wide">
          <div class="detail-section">
            <p class="eyebrow">Cognitive Bias</p>
            <h2 class="detail-title">${escapeHtml(entry.name)}</h2>
            <p class="detail-deck">${escapeHtml(entry.summary)}</p>
            <div class="pill-row">
              ${renderPills(entry)}
            </div>
            <div class="detail-grid">
              <div class="note-panel">
                <p class="detail-card-label">What it distorts</p>
                <p class="detail-card-value">${escapeHtml(entry.distortion || "Judgment under uncertainty.")}</p>
              </div>
              <div class="note-panel">
                <p class="detail-card-label">Typical trigger</p>
                <p class="detail-card-value">${escapeHtml(entry.commonTrigger || "A fast interpretation that feels easier than a fuller comparison.")}</p>
              </div>
              <div class="note-panel">
                <p class="detail-card-label">First countermove</p>
                <p class="detail-card-value">${escapeHtml(entry.firstCountermove || "Slow down the decision process before deciding what the label should be.")}</p>
              </div>
              <div class="note-panel">
                <p class="detail-card-label">Coverage depth</p>
                <p class="detail-card-value">${escapeHtml(entryPromptEffort(entry))}</p>
              </div>
            </div>
          </div>
          <aside class="hero-panel hero-side detail-side-stack">
            <div class="illustration-placeholder">
              <p class="illustration-placeholder-kicker">${escapeHtml(siteConfig.illustrationPlaceholderTitle)}</p>
              <div class="illustration-placeholder-art" aria-hidden="true">
                <div class="illustration-ring"></div>
                <div class="illustration-grid-mark"></div>
              </div>
              <p class="muted">${escapeHtml(siteConfig.illustrationPlaceholderBody)}</p>
            </div>
            <div class="note-panel">
              <h4>Source Trail</h4>
              <p class="muted">This entry is seeded from the Wikipedia cognitive-bias taxonomy.</p>
              <p><a class="text-link" href="${escapeHtml(entry.sourceUrl || "https://en.wikipedia.org/wiki/List_of_cognitive_biases")}">Open source reference</a></p>
            </div>
          </aside>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>How this entry is classified</h4>
            <ul class="muted">
              ${taskObjects
                .map((task) => `<li><strong>${escapeHtml(task.name)}:</strong> ${escapeHtml(task.description)}</li>`)
                .join("")}
              ${patternObjects
                .map((pattern) => `<li><strong>${escapeHtml(pattern.name)}:</strong> ${escapeHtml(pattern.description)}</li>`)
                .join("")}
            </ul>
          </div>
          <div class="note-panel">
            <h4>Mechanism snapshot</h4>
            <p class="muted">${escapeHtml(entry.mechanism || "This bias changes what feels most plausible before the full evidence or decision process has been fairly inspected.")}</p>
          </div>
        </div>

        <section class="detail-section section-block">
          <p class="eyebrow">Counter It</p>
          <h2 class="section-title">From naming to interruption</h2>
          <p class="section-copy">The goal is not just to recognize the label, but to change what happens next in the reasoning process.</p>
          <div class="lab-tab-shell" data-tab-group>
            <div class="lab-tablist" role="tablist" aria-label="Bias practice tabs">
              <button class="lab-tab" type="button" data-tab-button>Spot It</button>
              <button class="lab-tab" type="button" data-tab-button>Slow It</button>
              <button class="lab-tab" type="button" data-tab-button>Reframe It</button>
            </div>
            <div class="note-panel lab-panel" data-tab-panel>
              <p class="lab-panel-kicker">Spot It</p>
              <ul class="muted">${spotIt.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="note-panel lab-panel" data-tab-panel hidden>
              <p class="lab-panel-kicker">Slow It</p>
              <ul class="muted">${slowIt.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="note-panel lab-panel" data-tab-panel hidden>
              <p class="lab-panel-kicker">Reframe It</p>
              <ul class="muted">${reframeIt.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Related biases</h2>
              <p class="section-copy">These neighbors were selected from shared categories, shared patterns, and explicit editorial links where available.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${related.map((candidate) => renderBiasCard(candidate, "../../")).join("")}
          </div>
        </section>`,
  });
}

function renderCountermovesPage() {
  return renderPage({
    title: "Countermoves",
    description: "Process interventions for slowing down distorted judgment.",
    prefix: "../",
    currentId: "countermoves",
    routePath: "/countermoves/",
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Countermoves" },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Countermoves</p>
          <h2 class="detail-title">Process repairs worth standardizing</h2>
          <p class="detail-deck">A bias site gets more useful when it helps people change procedure, not just vocabulary. These countermoves are the first layer of that procedural toolkit.</p>
        </section>

        <section class="section-block">
          <div class="category-grid">
            ${(siteConfig.countermeasures || []).map((countermove) => `<div id="${countermove.slug}">${renderCountermoveCard(countermove, "../")}</div>`).join("")}
          </div>
        </section>`,
  });
}

function renderAboutPage() {
  const roadmap = siteConfig.roadmap;
  return renderPage({
    title: "About This Starter",
    description: "How CogBias uses a Wikipedia seed taxonomy while keeping a LogFall-like teaching feel.",
    prefix: "../",
    currentId: "about",
    routePath: "/about/",
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "About" },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">About</p>
          <h2 class="detail-title">Wide taxonomy first, richer editorial depth next</h2>
          <p class="detail-deck">This repo now uses the Wikipedia cognitive-bias list as a structured seed, then reshapes it into a static teaching site with the same practical feel as LogFall. The current version prioritizes broad navigable coverage, dual taxonomies, and future-ready illustration slots.</p>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Why this architecture works</h4>
            <p class="muted">The site can grow in two directions at once: broader coverage through the imported catalog, and deeper coverage through hand-authored upgrades to especially important entries.</p>
          </div>
          <div class="note-panel">
            <h4>Files to edit first</h4>
            <ul class="muted">
              <li><code>data/site.json</code> for branding, featured entries, taxonomy copy, and countermoves.</li>
              <li><code>data/biases.json</code> for generated coverage.</li>
              <li><code>data/deep_biases_overrides.json</code> for richer hand-authored entry overrides.</li>
              <li><code>scripts/import_wikipedia_biases.py</code> for refreshing the seed catalog.</li>
            </ul>
          </div>
        </div>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">What stayed, what changed</h2>
              <p class="section-copy">The point was to keep the feel of LogFall while changing the intellectual center of gravity.</p>
            </div>
          </div>
          <div class="two-column">
            <div class="note-panel">
              <h4>Keep</h4>
              <ul class="muted">${roadmap.keep.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="note-panel">
              <h4>Rewrite</h4>
              <ul class="muted">${roadmap.rewrite.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="note-panel">
              <h4>Add</h4>
              <ul class="muted">${roadmap.add.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="note-panel">
              <h4>Defer</h4>
              <ul class="muted">${roadmap.defer.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
          </div>
        </section>`,
  });
}

function renderNotFoundPage() {
  return renderPage({
    title: "Page Not Found",
    description: "The requested CogBias page could not be found.",
    prefix: "",
    currentId: "home",
    routePath: "/404.html",
    body: `
        <section class="detail-section">
          <p class="eyebrow">404</p>
          <h2 class="detail-title">That page is not here yet.</h2>
          <p class="detail-deck">The catalog is wide, but it is still growing. Head back to the main routes and keep building from there.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="./">Go Home</a>
            <a class="button button-secondary" href="./${siteConfig.sectionSlug}/">Browse Biases</a>
          </div>
        </section>`,
  });
}

async function copySiteAssets() {
  await fs.copyFile(path.join(siteDir, "styles.css"), path.join(projectRoot, "styles.css"));
  await fs.copyFile(path.join(siteDir, "app.js"), path.join(projectRoot, "app.js"));
}

async function writeTextFile(relPath, contents) {
  const outputPath = path.join(projectRoot, relPath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, contents, "utf8");
}

async function cleanOwnedOutput() {
  const ownedPaths = [
    "index.html",
    "404.html",
    "styles.css",
    "app.js",
    "about",
    "biases",
    "categories",
    "countermoves",
    siteConfig.patternSlug,
    "robots.txt",
    "site.webmanifest",
    "sitemap.xml",
  ];

  for (const relPath of ownedPaths) {
    await fs.rm(path.join(projectRoot, relPath), { recursive: true, force: true });
  }
}

async function writeSiteFiles() {
  await cleanOwnedOutput();
  await copySiteAssets();

  await writeTextFile("index.html", renderHomePage());
  await writeTextFile(`${siteConfig.sectionSlug}/index.html`, renderBiasIndexPage());
  await writeTextFile("categories/index.html", renderCategoryIndexPage());
  await writeTextFile(`${siteConfig.patternSlug}/index.html`, renderPatternIndexPage());
  await writeTextFile("countermoves/index.html", renderCountermovesPage());
  await writeTextFile("about/index.html", renderAboutPage());
  await writeTextFile("404.html", renderNotFoundPage());

  for (const entry of entries) {
    await writeTextFile(`${siteConfig.sectionSlug}/${entry.slug}/index.html`, renderBiasDetailPage(entry));
  }

  for (const task of tasks) {
    await writeTextFile(`categories/${task.slug}/index.html`, renderCategoryDetailPage(task));
  }

  for (const pattern of patterns) {
    await writeTextFile(`${siteConfig.patternSlug}/${pattern.slug}/index.html`, renderPatternDetailPage(pattern));
  }

  await writeTextFile(
    "robots.txt",
    `User-agent: *\nAllow: /\n${siteUrlWithSlash ? `\nSitemap: ${siteUrlWithSlash}sitemap.xml\n` : ""}`,
  );

  await writeTextFile(
    "site.webmanifest",
    JSON.stringify(
      {
        name: siteConfig.siteName,
        short_name: siteConfig.brandTitle,
        display: "standalone",
        background_color: "#eaf6ff",
        theme_color: "#0e2339",
      },
      null,
      2,
    ),
  );

  if (siteUrlWithSlash) {
    const routePaths = [
      "/",
      `/${siteConfig.sectionSlug}/`,
      "/categories/",
      `/${siteConfig.patternSlug}/`,
      "/countermoves/",
      "/about/",
      ...entries.map((entry) => `/${siteConfig.sectionSlug}/${entry.slug}/`),
      ...tasks.map((task) => `/categories/${task.slug}/`),
      ...patterns.map((pattern) => `/${siteConfig.patternSlug}/${pattern.slug}/`),
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routePaths
  .map((routePath) => `  <url><loc>${escapeHtml(absoluteUrlForRoute(routePath))}</loc></url>`)
  .join("\n")}
</urlset>
`;
    await writeTextFile("sitemap.xml", sitemap);
  }
}

await writeSiteFiles();
