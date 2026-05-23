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
const categoryBySlug = new Map(siteConfig.categories.map((category) => [category.slug, category]));
const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
const buildDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

for (const entry of entries) {
  if (!categoryBySlug.has(entry.category)) {
    throw new Error(`Unknown category "${entry.category}" on entry "${entry.slug}".`);
  }

  for (const relatedSlug of entry.related || []) {
    if (!entryBySlug.has(relatedSlug)) {
      throw new Error(`Unknown related slug "${relatedSlug}" on entry "${entry.slug}".`);
    }
  }
}

for (const countermove of siteConfig.countermeasures) {
  for (const relatedSlug of countermove.relatedBiases || []) {
    if (!entryBySlug.has(relatedSlug)) {
      throw new Error(`Unknown countermove related slug "${relatedSlug}" on "${countermove.slug}".`);
    }
  }
}

const categories = siteConfig.categories
  .map((category) => ({
    ...category,
    members: entries.filter((entry) => entry.category === category.slug),
  }))
  .filter((category) => category.members.length > 0);

const featuredEntries = siteConfig.featured.map((slug) => entryBySlug.get(slug)).filter(Boolean);
const domainOptions = [...new Set(entries.flatMap((entry) => entry.domains || []))].sort((a, b) =>
  a.localeCompare(b),
);
const effortOptions = [...new Set(entries.map((entry) => entry.effort))].sort((a, b) => a.localeCompare(b));

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

function toRoutePath(relPath) {
  if (relPath === "index.html") return "/";
  if (relPath === "404.html") return "/404.html";
  if (relPath.endsWith("/index.html")) {
    return `/${relPath.slice(0, -"index.html".length)}`;
  }
  return `/${relPath}`;
}

function absoluteUrlForRoute(routePath) {
  if (!siteUrlWithSlash) return "";
  return new URL(routePath.replace(/^\//, ""), siteUrlWithSlash).href;
}

function renderList(items = [], className = "muted") {
  return `<ul class="${escapeHtml(className)}">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function renderLinkChips(slugs = [], prefix = "") {
  return slugs
    .map((slug) => entryBySlug.get(slug))
    .filter(Boolean)
    .map(
      (entry) =>
        `<a class="path-link-chip" href="${prefix}${siteConfig.sectionSlug}/${entry.slug}/">${escapeHtml(entry.name)}</a>`,
    )
    .join("");
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

function renderNav(prefix, currentId) {
  const navItems = [
    { id: "home", label: "Home", href: `${prefix}` || "./" },
    { id: "biases", label: "All Biases", href: `${prefix}${siteConfig.sectionSlug}/` },
    { id: "categories", label: "Categories", href: `${prefix}categories/` },
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
          <p class="footer-note">${escapeHtml(siteConfig.brandTitle)} starter scaffold for a cognitive-biases GitHub Pages site.</p>
          <p class="footer-note">Source of truth: <code>data/site.json</code> and <code>data/biases.json</code>. Last build: ${escapeHtml(buildDate)}.</p>
          <p class="footer-note">${escapeHtml(siteConfig.copyrightNotice)}</p>
        </div>
      </footer>`;
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
    <meta name="theme-color" content="#111111" />
    ${canonical}
    <link rel="manifest" href="${prefix}site.webmanifest" />
    <link rel="stylesheet" href="${prefix}styles.css" />
    <script defer src="${prefix}app.js"></script>`;
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

function renderCategoryCard(category, prefix = "") {
  return `
          <article class="category-card">
            <h3><a href="${prefix}categories/${category.slug}/">${escapeHtml(category.name)}</a></h3>
            <p class="card-copy">${escapeHtml(category.description)}</p>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${category.members.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
            </div>
            <p class="muted">${escapeHtml(category.guidingQuestion)}</p>
          </article>`;
}

function renderBiasCard(entry, prefix = "") {
  const category = categoryBySlug.get(entry.category);
  const searchableBody = [
    entry.summary,
    entry.mechanism,
    entry.distortion,
    entry.defaultMove,
    entry.commonTrigger,
    category?.name || "",
    ...(entry.signals || []),
    ...(entry.domains || []),
  ].join(" ");

  return `
          <article
            class="entry-card"
            data-entry-card
            data-name="${escapeHtml(entry.name)}"
            data-aliases="${escapeHtml((entry.aliases || []).join(", "))}"
            data-category="${escapeHtml(entry.category)}"
            data-domains="${escapeHtml((entry.domains || []).join("||"))}"
            data-effort="${escapeHtml(entry.effort)}"
            data-body="${escapeHtml(searchableBody)}"
          >
            <h3><a href="${prefix}${siteConfig.sectionSlug}/${entry.slug}/">${escapeHtml(entry.name)}</a></h3>
            <p class="card-copy">${escapeHtml(entry.summary)}</p>
            <div class="pill-row">
              <span class="pill">${escapeHtml(category?.name || "Uncategorized")}</span>
              <span class="pill">${escapeHtml(entry.effort)}</span>
              ${(entry.domains || []).slice(0, 1).map((domain) => `<span class="pill">${escapeHtml(domain)}</span>`).join("")}
            </div>
          </article>`;
}

function renderCountermoveCard(countermove, prefix = "") {
  return `
          <article class="category-card">
            <h3>${escapeHtml(countermove.title)}</h3>
            <p class="card-copy">${escapeHtml(countermove.summary)}</p>
            ${renderList(countermove.steps, "muted")}
            <div class="path-link-row">
              ${renderLinkChips(countermove.relatedBiases, prefix)}
            </div>
          </article>`;
}

function renderCountermovePreview(countermove, prefix = "") {
  return `
          <article class="category-card">
            <h3><a href="${prefix}countermoves/#${countermove.slug}">${escapeHtml(countermove.title)}</a></h3>
            <p class="card-copy">${escapeHtml(countermove.summary)}</p>
            <div class="path-link-row">
              ${renderLinkChips(countermove.relatedBiases, prefix)}
            </div>
          </article>`;
}

function renderBiasDetailPage(entry) {
  const category = categoryBySlug.get(entry.category);
  const relatedEntries = (entry.related || []).map((slug) => entryBySlug.get(slug)).filter(Boolean);
  const prefix = "../../";

  return renderPage({
    title: entry.name,
    description: entry.summary,
    prefix,
    currentId: "biases",
    routePath: `/${siteConfig.sectionSlug}/${entry.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "All Biases", href: "../" },
      { label: entry.name },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Cognitive Bias</p>
            <h2 class="detail-title">${escapeHtml(entry.name)}</h2>
            <p class="detail-deck">${escapeHtml(entry.summary)}</p>
            <div class="pill-row">
              <span class="pill">${escapeHtml(category.name)}</span>
              <span class="pill">${escapeHtml(entry.effort)}</span>
              ${(entry.domains || []).map((domain) => `<span class="pill">${escapeHtml(domain)}</span>`).join("")}
            </div>
            <div class="detail-grid">
              <div class="note-panel">
                <p class="detail-card-label">Default mental move</p>
                <p class="detail-card-value">${escapeHtml(entry.defaultMove)}</p>
              </div>
              <div class="note-panel">
                <p class="detail-card-label">What it distorts</p>
                <p class="detail-card-value">${escapeHtml(entry.distortion)}</p>
              </div>
              <div class="note-panel">
                <p class="detail-card-label">Common trigger</p>
                <p class="detail-card-value">${escapeHtml(entry.commonTrigger)}</p>
              </div>
              <div class="note-panel">
                <p class="detail-card-label">First countermove</p>
                <p class="detail-card-value">${escapeHtml(entry.firstCountermove)}</p>
              </div>
            </div>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">Fast Read</p>
            <div class="stat-grid">
              <div class="stat-card">
                <span class="stat-value">${escapeHtml(String(entry.signals.length))}</span>
                <span class="stat-label">Signals To Watch</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${escapeHtml(String(entry.domains.length))}</span>
                <span class="stat-label">Typical Domains</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${escapeHtml(String(relatedEntries.length))}</span>
                <span class="stat-label">Related Biases</span>
              </div>
            </div>
            <div class="section-block">
              <div class="note-panel">
                <h4>Mechanism</h4>
                <p class="muted">${escapeHtml(entry.mechanism)}</p>
              </div>
            </div>
          </aside>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Signals You Are In It</h4>
            ${renderList(entry.signals, "muted")}
          </div>
          <div class="note-panel">
            <h4>Why This Category Matters</h4>
            <p class="muted">${escapeHtml(category.description)}</p>
            <p class="muted">${escapeHtml(category.guidingQuestion)}</p>
          </div>
        </div>

        <section class="detail-section section-block">
          <p class="eyebrow">Counter It</p>
          <h2 class="section-title">From detection to intervention</h2>
          <p class="section-copy">Bias work is less about slapping on a label and more about changing what happens next in the decision process.</p>
          <div class="lab-tab-shell" data-tab-group>
            <div class="lab-tablist" role="tablist" aria-label="Bias practice tabs">
              <button class="lab-tab" type="button" data-tab-button>Spot It</button>
              <button class="lab-tab" type="button" data-tab-button>Slow It</button>
              <button class="lab-tab" type="button" data-tab-button>Reframe It</button>
            </div>
            <div class="note-panel lab-panel" data-tab-panel>
              <p class="lab-panel-kicker">Spot It</p>
              ${renderList(entry.spotIt, "muted")}
            </div>
            <div class="note-panel lab-panel" data-tab-panel hidden>
              <p class="lab-panel-kicker">Slow It</p>
              ${renderList(entry.slowIt, "muted")}
            </div>
            <div class="note-panel lab-panel" data-tab-panel hidden>
              <p class="lab-panel-kicker">Reframe It</p>
              ${renderList(entry.reframeIt, "muted")}
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Related biases</h2>
              <p class="section-copy">These nearby patterns often travel with ${escapeHtml(entry.name.toLowerCase())} or get confused with it.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${relatedEntries.map((relatedEntry) => renderBiasCard(relatedEntry, prefix)).join("")}
          </div>
        </section>`,
  });
}

function renderCategoryDetailPage(category) {
  const prefix = "../../";
  const relatedCountermoves = siteConfig.countermeasures.filter((countermove) =>
    countermove.relatedBiases.some((slug) => category.members.some((entry) => entry.slug === slug)),
  );

  return renderPage({
    title: category.name,
    description: category.description,
    prefix,
    currentId: "categories",
    routePath: `/categories/${category.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "Categories", href: "../" },
      { label: category.name },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Category</p>
            <h2 class="detail-title">${escapeHtml(category.name)}</h2>
            <p class="detail-deck">${escapeHtml(category.description)}</p>
            <div class="pill-row">
              <span class="pill">${category.members.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
            </div>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">Guiding Question</p>
            <p class="muted">${escapeHtml(category.guidingQuestion)}</p>
          </aside>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Why This Cluster Helps</h4>
            <p class="muted">Categories in a bias site are most useful when they point to similar repair moves rather than just similar labels. This cluster groups distortions that tend to break judgment in a related way.</p>
          </div>
          <div class="note-panel">
            <h4>Useful Countermoves</h4>
            <div class="path-link-row">
              ${relatedCountermoves.map((countermove) => `<a class="path-link-chip" href="${prefix}countermoves/#${countermove.slug}">${escapeHtml(countermove.title)}</a>`).join("")}
            </div>
          </div>
        </div>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Biases in this category</h2>
              <p class="section-copy">Use these as side-by-side comparisons rather than as isolated terms to memorize.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${category.members.map((entry) => renderBiasCard(entry, prefix)).join("")}
          </div>
        </section>`,
  });
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
              <a class="button button-secondary" href="categories/">Explore Categories</a>
              <a class="button button-secondary" href="countermoves/">Open Countermoves</a>
            </div>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">At A Glance</p>
            <div class="stat-grid">
              <div class="stat-card">
                <span class="stat-value">${entries.length}</span>
                <span class="stat-label">Starter Biases</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${categories.length}</span>
                <span class="stat-label">Categories</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${siteConfig.countermeasures.length}</span>
                <span class="stat-label">Countermoves</span>
              </div>
            </div>
          </aside>
        </section>

        <section class="detail-section section-block">
          <p class="eyebrow">Not Just Fallacies</p>
          <h2 class="section-title">Biases can bend judgment long before anyone makes a public argument.</h2>
          <p class="section-copy">That is why this starter site emphasizes triggers, defaults, and process repairs instead of focusing only on rhetorical diagnosis.</p>
          <div class="two-column section-block">
            <div class="note-panel">
              <h4>Private cognition first</h4>
              <p class="muted">Many biases do their damage in forecasting, sampling, hiring, planning, and memory revision before they ever show up as explicit claims in debate.</p>
            </div>
            <div class="note-panel">
              <h4>Countermeasures matter</h4>
              <p class="muted">Bias education is more useful when each entry points toward a behavior change, a checklist, or a workflow improvement instead of just a label.</p>
            </div>
            <div class="note-panel">
              <h4>Evidence quality stays central</h4>
              <p class="muted">Biases often distort what evidence gets noticed, which cases count, and how outcomes are remembered. That makes sampling and review design part of the lesson.</p>
            </div>
            <div class="note-panel">
              <h4>Process beats vibes</h4>
              <p class="muted">A strong bias site should help users standardize better habits when judgment is noisy, social, and tempted by coherence more than by calibration.</p>
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Featured biases</h2>
              <p class="section-copy">This starter set is intentionally compact. It is meant to prove out the architecture before the full catalog lands.</p>
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
              <p class="section-copy">The categories are built around recurring failure modes in judgment, not around argument forms.</p>
            </div>
            <a class="inline-link" href="categories/">Open categories</a>
          </div>
          <div class="category-grid">
            ${categories.map((category) => renderCategoryCard(category)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Countermoves</h2>
              <p class="section-copy">These are process moves worth standardizing once the taxonomy starts to settle.</p>
            </div>
            <a class="inline-link" href="countermoves/">See the full playbook</a>
          </div>
          <div class="category-grid">
            ${siteConfig.countermeasures.slice(0, 3).map((countermove) => renderCountermovePreview(countermove)).join("")}
          </div>
        </section>`,
  });
}

function renderBiasIndexPage() {
  return renderPage({
    title: "All Biases",
    description: `Search and compare ${siteConfig.entryLabelPlural} by category, domain, and countermove effort.`,
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
          <p class="detail-deck">This starter index uses domain and countermove effort as filters because cognitive-bias work is often about where the distortion appears and how costly it is to correct.</p>
          <div class="note-panel search-panel section-block">
            <div class="search-row">
              <input class="search-input" type="search" placeholder="Search biases, aliases, or mechanisms..." aria-label="Search biases" data-search-input />
              <select class="search-select" data-category-filter aria-label="Filter by category">
                <option value="">All categories</option>
                ${categories.map((category) => `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</option>`).join("")}
              </select>
              <select class="search-select" data-domain-filter aria-label="Filter by domain">
                <option value="">All domains</option>
                ${domainOptions.map((domain) => `<option value="${escapeHtml(domain)}">${escapeHtml(domain)}</option>`).join("")}
              </select>
              <select class="search-select" data-effort-filter aria-label="Filter by effort">
                <option value="">All countermove effort</option>
                ${effortOptions.map((effort) => `<option value="${escapeHtml(effort)}">${escapeHtml(effort)}</option>`).join("")}
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
    description: "Browse the cognitive-bias taxonomy by recurring failure mode in judgment.",
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
            <p class="eyebrow">Taxonomy</p>
            <h2 class="detail-title">Categories for recurring judgment failures</h2>
            <p class="detail-deck">These clusters are less about memorizing labels and more about seeing which repair moves belong together.</p>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">How To Use Them</p>
            <p class="muted">Ask which kind of distortion is active, then look for the smallest process change that would make the judgment more reliable.</p>
          </aside>
        </section>

        <section class="section-block">
          <div class="category-grid">
            ${categories.map((category) => renderCategoryCard(category, "../")).join("")}
          </div>
        </section>`,
  });
}

function renderCountermovesPage() {
  return renderPage({
    title: "Countermoves",
    description: "Bias-specific process moves for slowing down distorted judgment.",
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
          <p class="detail-deck">A bias site becomes useful when it does more than point at a flaw. These are starter moves for turning diagnosis into better decisions, cleaner postmortems, and sturdier sampling habits.</p>
        </section>

        <section class="section-block">
          <div class="category-grid">
            ${siteConfig.countermeasures
              .map(
                (countermove) => `
            <div id="${countermove.slug}">
              ${renderCountermoveCard(countermove, "../")}
            </div>`,
              )
              .join("")}
          </div>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Why this section exists</h4>
            <p class="muted">Fallacy sites can lean heavily on naming. Bias sites need to lean harder on process because the same person can sincerely know the label and still reproduce the distortion in planning, hiring, reviewing, and forecasting.</p>
          </div>
          <div class="note-panel">
            <h4>What to add later</h4>
            <p class="muted">Decision journals, printable checklists, calibration prompts, and team-review templates would naturally extend this section once the main taxonomy and voice settle.</p>
          </div>
        </div>`,
  });
}

function renderAboutPage() {
  const roadmap = siteConfig.roadmap;

  return renderPage({
    title: "About This Starter",
    description: "Why the cognitive-bias site should live in its own repo and how this starter differs from LogFall.",
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
          <h2 class="detail-title">A separate repo on purpose</h2>
          <p class="detail-deck">This starter was forked from LogFall structurally, but it now assumes that cognitive biases deserve their own content model, navigation, and repair logic. The overlap is real, but the teaching unit is different.</p>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Why not keep one repo?</h4>
            <p class="muted">Because bias pages will drift toward triggers, domains, classic distortions, and process interventions, while fallacy pages remain centered on argument structure and public reasoning mistakes. Shared code can be extracted later if the two sites stabilize.</p>
          </div>
          <div class="note-panel">
            <h4>Files to edit first</h4>
            <ul class="muted">
              <li><code>data/site.json</code> for name, sections, categories, and roadmap.</li>
              <li><code>data/biases.json</code> for the actual catalog.</li>
              <li><code>site/styles.css</code> for the visual system.</li>
              <li><code>scripts/build.mjs</code> for page architecture.</li>
            </ul>
          </div>
        </div>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">What stayed, what changed</h2>
              <p class="section-copy">These lists are deliberately practical so the next build phase has a clear bias-first direction.</p>
            </div>
          </div>
          <div class="two-column">
            <div class="note-panel">
              <h4>Keep</h4>
              ${renderList(roadmap.keep, "muted")}
            </div>
            <div class="note-panel">
              <h4>Rewrite</h4>
              ${renderList(roadmap.rewrite, "muted")}
            </div>
            <div class="note-panel">
              <h4>Add</h4>
              ${renderList(roadmap.add, "muted")}
            </div>
            <div class="note-panel">
              <h4>Defer</h4>
              ${renderList(roadmap.defer, "muted")}
            </div>
          </div>
        </section>`,
  });
}

function renderNotFoundPage() {
  return renderPage({
    title: "Page Not Found",
    description: "The requested BiasFall page could not be found.",
    prefix: "",
    currentId: "home",
    routePath: "/404.html",
    body: `
        <section class="detail-section">
          <p class="eyebrow">404</p>
          <h2 class="detail-title">That page is not here yet.</h2>
          <p class="detail-deck">This starter is intentionally small while the taxonomy is being shaped. Head back to the main routes and keep building from there.</p>
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
  await writeTextFile("countermoves/index.html", renderCountermovesPage());
  await writeTextFile("about/index.html", renderAboutPage());
  await writeTextFile("404.html", renderNotFoundPage());

  for (const entry of entries) {
    await writeTextFile(`${siteConfig.sectionSlug}/${entry.slug}/index.html`, renderBiasDetailPage(entry));
  }

  for (const category of categories) {
    await writeTextFile(`categories/${category.slug}/index.html`, renderCategoryDetailPage(category));
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
        background_color: "#f3f4f6",
        theme_color: "#111111",
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
      "/countermoves/",
      "/about/",
      ...entries.map((entry) => `/${siteConfig.sectionSlug}/${entry.slug}/`),
      ...categories.map((category) => `/categories/${category.slug}/`),
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
