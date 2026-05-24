import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "data");
const siteDir = path.join(projectRoot, "site");

async function readJsonFile(fileName) {
  return JSON.parse(await fs.readFile(path.join(dataDir, fileName), "utf8"));
}

async function readJsonArrayFiles(fileNames) {
  const merged = [];

  for (const fileName of fileNames) {
    try {
      const data = await readJsonFile(fileName);
      if (!Array.isArray(data)) {
        throw new Error(`Expected "${fileName}" to contain a JSON array.`);
      }
      merged.push(...data);
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  return merged;
}

async function readJsonArraySeries(prefix) {
  const fileNames = (await fs.readdir(dataDir))
    .filter((fileName) => fileName === `${prefix}.json` || (fileName.startsWith(`${prefix}_`) && fileName.endsWith(".json")))
    .sort((left, right) => {
      if (left === `${prefix}.json`) return -1;
      if (right === `${prefix}.json`) return 1;
      return left.localeCompare(right);
    });

  return readJsonArrayFiles(fileNames);
}

const siteConfig = await readJsonFile("site.json");
const rawEntries = await readJsonFile("biases.json");
const editorialEnrichments = await readJsonArraySeries("editorial_enrichments");
const teachingModules = await readJsonArraySeries("entry_teaching_modules");
const learningPathData = await readJsonArraySeries("learning_paths");
const selfCheckData = await readJsonArraySeries("self_checks");
const assessmentBankData = await readJsonArraySeries("assessment_bank");
const promptKitData = await readJsonArraySeries("prompt_kits");
const theoryArticleData = await readJsonArraySeries("theory_articles");

function mergeUniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function mergeEntryData(baseEntries, enrichments) {
  const enrichmentsBySlug = new Map(enrichments.map((entry) => [entry.slug, entry]));
  return baseEntries.map((entry) => {
    const enrichment = enrichmentsBySlug.get(entry.slug);
    if (!enrichment) return entry;
    return {
      ...entry,
      ...enrichment,
      aliases: mergeUniqueStrings([...(entry.aliases || []), ...(enrichment.aliases || [])]),
      related: mergeUniqueStrings([...(entry.related || []), ...(enrichment.related || [])]),
    };
  });
}

const entries = mergeEntryData(mergeEntryData(rawEntries, editorialEnrichments), teachingModules);
const caseStudySlug = siteConfig.caseStudySlug || "case-studies";

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

const learningPaths = learningPathData.map((path) => ({
  ...path,
  members: (path.biasSlugs || []).map((slug) => entryBySlug.get(slug)).filter(Boolean),
}));

const theoryArticles = theoryArticleData.map((article) => ({
  ...article,
  relatedEntries: (article.relatedBiases || []).map((slug) => entryBySlug.get(slug)).filter(Boolean),
}));

function buildCaseStudyLibrary(entryList) {
  const library = new Map();

  for (const entry of entryList) {
    for (const item of entry.caseStudies || []) {
      const key = `${String(item.url || "").trim().toLowerCase()}::${String(item.title || "").trim().toLowerCase()}`;
      const existing = library.get(key);

      if (!existing) {
        library.set(key, {
          ...item,
          entrySlugs: [entry.slug],
          categories: [...(entry.tasks || [])],
          patterns: [...(entry.patterns || [])],
        });
        continue;
      }

      existing.entrySlugs = mergeUniqueStrings([...existing.entrySlugs, entry.slug]);
      existing.categories = mergeUniqueStrings([...existing.categories, ...(entry.tasks || [])]);
      existing.patterns = mergeUniqueStrings([...existing.patterns, ...(entry.patterns || [])]);
    }
  }

  return [...library.values()]
    .map((item) => ({
      ...item,
      entries: item.entrySlugs
        .map((slug) => entryBySlug.get(slug))
        .filter(Boolean)
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort(
      (left, right) =>
        right.entries.length - left.entries.length ||
        String(left.title || "").localeCompare(String(right.title || "")),
    );
}

const caseStudyLibrary = buildCaseStudyLibrary(entries);

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

  for (const confusion of entry.confusions || []) {
    if (!entryBySlug.has(confusion.slug)) {
      throw new Error(`Unknown confusion slug "${confusion.slug}" on entry "${entry.slug}".`);
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

const seenPathSlugs = new Set();
for (const path of learningPaths) {
  if (seenPathSlugs.has(path.slug)) {
    throw new Error(`Duplicate learning path slug "${path.slug}".`);
  }
  seenPathSlugs.add(path.slug);

  for (const slug of path.biasSlugs || []) {
    if (!entryBySlug.has(slug)) {
      throw new Error(`Unknown learning path slug "${slug}" on path "${path.slug}".`);
    }
  }
}

const seenCheckSlugs = new Set();
for (const check of selfCheckData) {
  if (seenCheckSlugs.has(check.slug)) {
    throw new Error(`Duplicate self-check slug "${check.slug}".`);
  }
  seenCheckSlugs.add(check.slug);

  for (const slug of check.relatedBiases || []) {
    if (!entryBySlug.has(slug)) {
      throw new Error(`Unknown self-check related slug "${slug}" on "${check.slug}".`);
    }
  }
}

const seenPromptSlugs = new Set();
for (const promptKit of promptKitData) {
  if (seenPromptSlugs.has(promptKit.slug)) {
    throw new Error(`Duplicate prompt slug "${promptKit.slug}".`);
  }
  seenPromptSlugs.add(promptKit.slug);

  for (const slug of promptKit.relatedBiases || []) {
    if (!entryBySlug.has(slug)) {
      throw new Error(`Unknown prompt related slug "${slug}" on "${promptKit.slug}".`);
    }
  }
}

const seenTheorySlugs = new Set();
for (const article of theoryArticles) {
  if (seenTheorySlugs.has(article.slug)) {
    throw new Error(`Duplicate theory article slug "${article.slug}".`);
  }
  seenTheorySlugs.add(article.slug);

  for (const slug of article.relatedBiases || []) {
    if (!entryBySlug.has(slug)) {
      throw new Error(`Unknown theory related slug "${slug}" on "${article.slug}".`);
    }
  }
}

const seenAssessmentIds = new Set();
for (const item of assessmentBankData) {
  if (seenAssessmentIds.has(item.id)) {
    throw new Error(`Duplicate assessment item id "${item.id}".`);
  }
  seenAssessmentIds.add(item.id);

  if (!entryBySlug.has(item.correctBias)) {
    throw new Error(`Unknown assessment correct bias "${item.correctBias}" on "${item.id}".`);
  }

  for (const slug of item.biasOptions || []) {
    if (!entryBySlug.has(slug)) {
      throw new Error(`Unknown assessment option slug "${slug}" on "${item.id}".`);
    }
  }

  if (!(item.biasOptions || []).includes(item.correctBias)) {
    throw new Error(`Assessment item "${item.id}" must include the correct bias in its options.`);
  }

  if (!(item.moveOptions || []).includes(item.correctMove)) {
    throw new Error(`Assessment item "${item.id}" must include the correct move in its options.`);
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

function safeJsonForScript(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003C")
    .replaceAll("-->", "--\\u003E")
    .replaceAll("</script", "<\\/script");
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
    { id: "paths", label: "Paths", href: `${prefix}${siteConfig.pathSlug}/` },
    { id: "countermoves", label: "Countermoves", href: `${prefix}countermoves/` },
    { id: "check", label: "Check Yourself", href: `${prefix}${siteConfig.checkSlug}/` },
    { id: "assessment", label: "Assessment", href: `${prefix}${siteConfig.assessmentSlug}/` },
    { id: "case-studies", label: "Case Studies", href: `${prefix}${caseStudySlug}/` },
    { id: "prompts", label: "Prompts", href: `${prefix}${siteConfig.promptSlug}/` },
    { id: "theory", label: "Theory", href: `${prefix}${siteConfig.theorySlug}/` },
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
          <p class="footer-note">Source of truth: <code>data/site.json</code>, <code>data/biases.json</code>, <code>data/editorial_enrichments*.json</code>, <code>data/entry_teaching_modules*.json</code>, <code>data/learning_paths*.json</code>, <code>data/self_checks*.json</code>, <code>data/assessment_bank*.json</code>, <code>data/prompt_kits*.json</code>, <code>data/theory_articles*.json</code>, and <code>scripts/import_wikipedia_biases.py</code>.</p>
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

function sentenceCase(value = "") {
  if (!value) return "";
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function pathObjectsForEntry(entry) {
  return learningPaths.filter((path) => (path.biasSlugs || []).includes(entry.slug));
}

function selfChecksForEntry(entry) {
  return selfCheckData.filter((check) => (check.relatedBiases || []).includes(entry.slug));
}

function promptKitsForEntry(entry) {
  return promptKitData.filter((promptKit) => (promptKit.relatedBiases || []).includes(entry.slug));
}

function theoryArticlesForEntry(entry, limit = 3) {
  return theoryArticles.filter((article) => (article.relatedBiases || []).includes(entry.slug)).slice(0, limit);
}

function examplesFor(entry) {
  if (entry.examples) return entry.examples;

  return {
    everyday: `In everyday life, this often looks like people ${sentenceCase(
      entry.defaultMove || "leaning on the easiest first interpretation",
    )} when ${sentenceCase(entry.commonTrigger || "uncertainty is high")}.`,
    workplace: `At work, this often appears when teams ${sentenceCase(
      entry.defaultMove || "treat the first coherent story as sufficient",
    )} instead of slowing the process long enough to compare alternatives.`,
    public: `In public discourse, it often surfaces when commentators ${sentenceCase(
      entry.defaultMove || "move too quickly from salience to conclusion",
    )} while the underlying evidence remains thinner than it sounds.`,
  };
}

function redFlagsFor(entry) {
  if (entry.redFlags?.length) return entry.redFlags;
  if (entry.signals?.length) return entry.signals;

  return [
    `The default move is to ${sentenceCase(entry.defaultMove || "trust the first plausible interpretation")}.`,
    `The bias is easiest to trigger when ${sentenceCase(entry.commonTrigger || "the situation feels rushed or vivid")}.`,
    "The judgment starts to feel settled before competing interpretations have had equal time.",
  ];
}

function reflectionQuestionsFor(entry) {
  if (entry.reflectionQuestions?.length) return entry.reflectionQuestions;

  const task = entryTaskObjects(entry)[0];
  const pattern = entryPatternObjects(entry)[0];
  return [
    task?.guidingQuestion || "What kind of judgment is failing here?",
    pattern?.guidingQuestion || "What kind of hidden pull is bending this judgment?",
    "What evidence or comparison would most seriously change the current call?",
  ];
}

function repairMovesFor(entry) {
  if (entry.repairMoves) return entry.repairMoves;

  const linked = (siteConfig.countermeasures || []).find((countermove) =>
    (countermove.relatedBiases || []).includes(entry.slug),
  );

  return {
    solo: entry.firstCountermove || "Slow the judgment down long enough to name the live alternatives.",
    team:
      linked?.steps?.[1] ||
      "Ask someone else to restate the case from a genuinely different starting point before committing.",
    system:
      linked?.summary ||
      "Change the workflow so this distortion becomes harder to repeat by default next time.",
  };
}

function confusionsFor(entry) {
  if (entry.confusions?.length) {
    return entry.confusions
      .map((item) => ({
        ...item,
        entry: entryBySlug.get(item.slug),
      }))
      .filter((item) => item.entry);
  }

  return relatedEntriesFor(entry, 3).map((candidate) => ({
    slug: candidate.slug,
    entry: candidate,
    note: "A nearby label worth comparing before settling the diagnosis.",
  }));
}

function teachingNoteFor(entry) {
  if (entry.teachingNote) return entry.teachingNote;
  const task = entryTaskObjects(entry)[0];
  const pattern = entryPatternObjects(entry)[0];
  return `Start with the ${sentenceCase(
    task?.name || "judgment",
  )} problem, then show how the ${sentenceCase(pattern?.name || "current")} pattern makes the distortion feel natural from the inside.`;
}

function quickCheckFor(entry) {
  if (entry.quickCheck) return entry.quickCheck;
  return reflectionQuestionsFor(entry)[0] || entry.firstCountermove || "What comparison would most improve this judgment?";
}

function practiceLabFor(entry) {
  if (entry.practiceLab) return entry.practiceLab;

  return {
    intro:
      "Follow the moment where the bias first becomes attractive, then track how that attraction turns into a distorted judgment before jumping straight to the label.",
    stages: [
      {
        title: "Trigger",
        text:
          entry.commonTrigger ||
          "A fast interpretation begins to feel easier than a fuller comparison of the alternatives.",
      },
      {
        title: "Felt certainty",
        text:
          entry.whatItFeelsLike ||
          "The first coherent reading starts to feel like ordinary good judgment from the inside.",
      },
      {
        title: "Distortion",
        text: entry.distortion || "Judgment under uncertainty becomes warped before the process is inspected fairly.",
      },
      {
        title: "Reset",
        text:
          entry.firstCountermove ||
          "Slow the process down long enough to compare live alternatives before the label hardens.",
      },
    ],
    repairQuestion: quickCheckFor(entry),
  };
}

function caseStudiesFor(entry) {
  return entry.caseStudies || [];
}

function companionReadingFor(entry) {
  const items = [];
  const relatedTheory = theoryArticlesForEntry(entry, 2).map((article) => ({
    title: article.title,
    source: "CogBias theory",
    href: `../../${siteConfig.theorySlug}/${article.slug}/`,
    why: article.summary,
  }));

  if (entry.sourceUrl) {
    items.push({
      title: `${entry.name} seed reference`,
      source: "Wikipedia seed",
      href: entry.sourceUrl,
      why: "Use the broader source article for additional definitions, examples, and historical notes.",
    });
  }

  return [...relatedTheory, ...items];
}

function renderEntryLinkChips(slugs = [], prefix = "") {
  return slugs
    .map((slug) => entryBySlug.get(slug))
    .filter(Boolean)
    .map(
      (entry) =>
        `<a class="path-link-chip" href="${prefix}${siteConfig.sectionSlug}/${entry.slug}/">${escapeHtml(entry.name)}</a>`,
    )
    .join("");
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

function renderPathCard(path, prefix = "") {
  return `
          <article class="category-card">
            <h3><a href="${prefix}${siteConfig.pathSlug}/${path.slug}/">${escapeHtml(path.title)}</a></h3>
            <p class="card-copy">${escapeHtml(path.summary)}</p>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${path.members.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
              <span class="teaching-pill">${escapeHtml(path.audience)}</span>
            </div>
            <p class="muted">${escapeHtml(path.guidingQuestion)}</p>
          </article>`;
}

function renderSelfCheckCard(check, prefix = "") {
  return `
          <article class="category-card">
            <h3>${escapeHtml(check.title)}</h3>
            <p class="card-copy">${escapeHtml(check.summary)}</p>
            <p class="muted"><strong>Question:</strong> ${escapeHtml(check.question)}</p>
            <ul class="muted">
              ${check.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
            </ul>
            <div class="path-link-row">
              ${renderEntryLinkChips(check.relatedBiases || [], prefix)}
            </div>
          </article>`;
}

function renderPromptCard(promptKit, prefix = "") {
  const promptText = (promptKit.promptLines || []).join("\n");
  return `
          <article class="category-card prompt-card">
            <h3>${escapeHtml(promptKit.title)}</h3>
            <p class="card-copy">${escapeHtml(promptKit.intro)}</p>
            <p class="muted"><strong>Use when:</strong> ${escapeHtml(promptKit.requirements)}</p>
            <div class="path-link-row">
              ${renderEntryLinkChips(promptKit.relatedBiases || [], prefix)}
            </div>
            <details class="prompt-details">
              <summary>Open prompt</summary>
              <pre class="prompt-block">${escapeHtml(promptText)}</pre>
            </details>
          </article>`;
}

function renderGaugeCard(gauge) {
  return `
          <article class="gauge-card" style="--value:${Number(gauge.value) || 0};">
            <div class="gauge-card-top">
              <p class="gauge-kicker">${escapeHtml(gauge.label)}</p>
              <p class="gauge-score">${escapeHtml(gauge.value)}</p>
            </div>
            <p class="gauge-summary muted">${escapeHtml(gauge.note || "")}</p>
            <div class="gauge-meter" style="--value:${Number(gauge.value) || 0};">
              <div class="gauge-meter-fill"></div>
              <div class="gauge-meter-marker"></div>
            </div>
            <div class="gauge-scale">
              <span>${escapeHtml(gauge.low || "Low")}</span>
              <span>${escapeHtml(gauge.high || "High")}</span>
            </div>
          </article>`;
}

function renderTheoryArticleCard(article, prefix = "") {
  return `
          <article class="category-card theory-article-card">
            <h3><a href="${prefix}${siteConfig.theorySlug}/${article.slug}/">${escapeHtml(article.title)}</a></h3>
            <p class="card-copy">${escapeHtml(article.summary)}</p>
            <div class="path-link-row">
              ${article.relatedEntries
                .slice(0, 3)
                .map(
                  (entry) =>
                    `<a class="path-link-chip" href="${prefix}${siteConfig.sectionSlug}/${entry.slug}/">${escapeHtml(entry.name)}</a>`,
                )
                .join("")}
            </div>
          </article>`;
}

function renderCaseStudyCard(item, prefix = "") {
  const biasNames = item.entries.map((entry) => entry.name);
  const title = item.url
    ? `<a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>`
    : escapeHtml(item.title);

  return `
          <article
            class="category-card case-study-card"
            data-entry-card
            data-name="${escapeHtml(item.title || "")}"
            data-aliases="${escapeHtml(biasNames.join(", "))}"
            data-categories="${escapeHtml((item.categories || []).join("||"))}"
            data-patterns="${escapeHtml((item.patterns || []).join("||"))}"
            data-body="${escapeHtml(
              [
                item.summary,
                item.whyItFits,
                item.source,
                item.year,
                ...biasNames,
                ...(item.categories || []),
                ...(item.patterns || []),
              ]
                .filter(Boolean)
                .join(" "),
            )}"
          >
            <h3>${title}</h3>
            <p class="card-copy">${escapeHtml(item.summary || "")}</p>
            <p class="muted"><strong>Why it fits:</strong> ${escapeHtml(item.whyItFits || "")}</p>
            <p class="case-source">${escapeHtml(item.source || "")}${item.year ? ` · ${escapeHtml(item.year)}` : ""}</p>
            <div class="path-link-row">
              ${item.entries
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
              <a class="button button-secondary" href="${siteConfig.pathSlug}/">Browse Paths</a>
              <a class="button button-secondary" href="${siteConfig.assessmentSlug}/">Take Assessment</a>
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
                <span class="stat-value">${learningPaths.length}</span>
                <span class="stat-label">Learning Paths</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${selfCheckData.length}</span>
                <span class="stat-label">Self-Audits</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${assessmentBankData.length}</span>
                <span class="stat-label">Assessment Scenarios</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${caseStudyLibrary.length}</span>
                <span class="stat-label">Case Studies</span>
              </div>
            </div>
            <div class="note-panel">
              <h4>1. Start with a path</h4>
              <p class="muted">Use a curated path when you know the context but not the label: decision-making, people judgment, evidence review, or postmortems.</p>
            </div>
            <div class="note-panel" style="margin-top:12px;">
              <h4>2. Jump to the bias page</h4>
              <p class="muted">Core entries now include examples, nearby confusions, reflection questions, and repair moves at the solo, team, and system levels.</p>
            </div>
            <div class="note-panel" style="margin-top:12px;">
              <h4>3. Change the process</h4>
              <p class="muted">Use the self-checks, countermoves, and prompt kits to modify the workflow that keeps reproducing the distortion.</p>
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
              <h2 class="section-title">Learning paths</h2>
              <p class="section-copy">These curated routes are the closest analogue to LogFall's teaching paths: smaller, more purposeful sequences for a specific job of thinking.</p>
            </div>
            <a class="inline-link" href="${siteConfig.pathSlug}/">Open all paths</a>
          </div>
          <div class="category-grid">
            ${learningPaths.map((path) => renderPathCard(path)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Check yourself</h2>
              <p class="section-copy">Short self-audits for the moments when bias is most likely to slide past you: before a decision, before a forecast, before a people judgment, and after a surprising outcome.</p>
            </div>
            <a class="inline-link" href="${siteConfig.checkSlug}/">Open the field guide</a>
          </div>
          <div class="category-grid">
            ${selfCheckData.slice(0, 3).map((check) => renderSelfCheckCard(check)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Assessment</h2>
              <p class="section-copy">A mixed scenario runner that asks two questions at once: which bias is most likely shaping the judgment, and what is the strongest next debiasing move?</p>
            </div>
            <a class="inline-link" href="${siteConfig.assessmentSlug}/">Open assessment</a>
          </div>
          <div class="two-column">
            <div class="note-panel">
              <h4>What it tests</h4>
              <p class="muted">The assessment is not just label recall. Each item asks you to diagnose the likely bias pressure and choose the repair that would most improve the process.</p>
            </div>
            <div class="note-panel">
              <h4>How it differs from self-checks</h4>
              <p class="muted">Self-checks are preventive field tools you run on yourself. The assessment is a mixed set for practice, calibration, and classroom comparison.</p>
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Case studies</h2>
              <p class="section-copy">Sourced teaching cases help the bias pages feel less abstract. They show where bias pressure becomes visible in hiring, forecasting, policy, meetings, and public interpretation.</p>
            </div>
            <a class="inline-link" href="${caseStudySlug}/">Open case study library</a>
          </div>
          <div class="category-grid">
            ${caseStudyLibrary.slice(0, 3).map((item) => renderCaseStudyCard(item)).join("")}
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
              <h2 class="section-title">Prompt kits</h2>
              <p class="section-copy">Bias-aware AI prompts modeled on the practical spirit of LogFall's prompt section, but tuned for decisions, forecasting, people judgment, and media calibration.</p>
            </div>
            <a class="inline-link" href="${siteConfig.promptSlug}/">Open prompt kits</a>
          </div>
          <div class="category-grid">
            ${promptKitData.slice(0, 2).map((promptKit) => renderPromptCard(promptKit)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Theory</h2>
              <p class="section-copy">Stand-alone essays on taxonomy, teaching, social pressure, calibration, and why bias work has to change process rather than merely sharpen vocabulary.</p>
            </div>
            <a class="inline-link" href="${siteConfig.theorySlug}/">Read the theory page</a>
          </div>
          <div class="category-grid theory-article-grid">
            ${theoryArticles.slice(0, 3).map((article) => renderTheoryArticleCard(article)).join("")}
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

function renderPathsIndexPage() {
  return renderPage({
    title: "Learning Paths",
    description: "Curated routes through the bias catalog for common thinking jobs.",
    prefix: "../",
    currentId: "paths",
    routePath: `/${siteConfig.pathSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Learning Paths" },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Paths</p>
            <h2 class="detail-title">Smaller routes through a large catalog</h2>
            <p class="detail-deck">The alphabetical list is useful once you know the label. The path pages are for the earlier moment when you know the context, the failure mode, or the teaching goal, but not yet the exact bias name.</p>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">How To Use Them</p>
            <p class="muted">Choose the path that fits the job: better decisions, better forecasting, fairer people judgment, cleaner evidence review, or more honest postmortems.</p>
          </aside>
        </section>

        <section class="section-block">
          <div class="category-grid">
            ${learningPaths.map((path) => renderPathCard(path, "../")).join("")}
          </div>
        </section>`,
  });
}

function renderPathDetailPage(path) {
  return renderPage({
    title: path.title,
    description: path.summary,
    prefix: "../../",
    currentId: "paths",
    routePath: `/${siteConfig.pathSlug}/${path.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "Paths", href: "../" },
      { label: path.title },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Learning Path</p>
            <h2 class="detail-title">${escapeHtml(path.title)}</h2>
            <p class="detail-deck">${escapeHtml(path.summary)}</p>
            <div class="pill-row">
              <span class="pill pill-task">${path.members.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
              <span class="pill">${escapeHtml(path.audience)}</span>
            </div>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">Use It When</p>
            <p class="muted">${escapeHtml(path.whenToUse)}</p>
            <p class="eyebrow" style="margin-top:14px;">Guiding Question</p>
            <p class="muted">${escapeHtml(path.guidingQuestion)}</p>
          </aside>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>What this path is trying to prevent</h4>
            <p class="muted">These entries belong together because they often appear in the same practical sequence. One bias sets the stage, another narrows the options, and a third edits the memory afterward.</p>
          </div>
          <div class="note-panel">
            <h4>How to study it</h4>
            <p class="muted">Work the pages in order, then loop back and compare which distortions happened earliest, which ones protected the first impression, and which ones interfered with later learning.</p>
          </div>
        </div>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Biases in this path</h2>
              <p class="section-copy">This is a deliberate sequence, not just a themed pile. Start at the top if the context is new to you.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${path.members.map((entry) => renderBiasCard(entry, "../../")).join("")}
          </div>
        </section>`,
  });
}

function renderCheckYourselfPage() {
  return renderPage({
    title: "Check Yourself",
    description: "Bias self-audits for real decisions, forecasts, people judgment, and postmortems.",
    prefix: "../",
    currentId: "check",
    routePath: `/${siteConfig.checkSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Check Yourself" },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Check Yourself</p>
          <h2 class="detail-title">Short audits for the moments bias is most likely to slip through</h2>
          <p class="detail-deck">These are not quizzes. They are small procedural checkpoints you can run before a choice, before a forecast, before a people judgment, and after a result when memory is already trying to smooth the story.</p>
        </section>

        <section class="section-block">
          <div class="category-grid">
            ${selfCheckData.map((check) => `<div id="${check.slug}">${renderSelfCheckCard(check, "../")}</div>`).join("")}
          </div>
        </section>`,
  });
}

function renderAssessmentPage() {
  const payload = assessmentBankData.map((item) => ({
    ...item,
    correctBiasName: entryBySlug.get(item.correctBias)?.name || item.correctBias,
    correctBiasHref: `../${siteConfig.sectionSlug}/${item.correctBias}/`,
    biasOptions: item.biasOptions.map((slug) => ({
      slug,
      name: entryBySlug.get(slug)?.name || slug,
      href: `../${siteConfig.sectionSlug}/${slug}/`,
    })),
  }));

  return renderPage({
    title: "Assessment",
    description: "A mixed scenario assessment for naming likely bias pressure and choosing the best next debiasing move.",
    prefix: "../",
    currentId: "assessment",
    routePath: `/${siteConfig.assessmentSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Assessment" },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Assessment</p>
          <h2 class="detail-title">A mixed scenario test of what is bending the judgment and what would interrupt it best</h2>
          <p class="detail-deck">Each run draws from a bank of short bias scenarios. For every item, choose the bias that most likely explains the drift and then choose the best next move for improving the process.</p>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>What it is for</h4>
            <p class="muted">Use this for classroom comparison, self-calibration, or team practice when you want something more demanding than a definition quiz. The second answer matters as much as the first.</p>
          </div>
          <div class="note-panel">
            <h4>How it differs from self-checks</h4>
            <p class="muted">Self-checks are preventive field tools. This page is a mixed assessment built for diagnosis plus repair: name the likely pressure, then choose the best intervention.</p>
          </div>
        </div>

        <section class="panel search-panel assessment-runner-panel" data-bias-assessment-shell data-assessment-size="10">
          <div class="section-header">
            <div>
              <h3 class="section-title">Take the mixed scenario assessment</h3>
              <p class="section-copy">Each set uses real decision, forecasting, conflict, and meeting situations rather than bare definitions.</p>
            </div>
          </div>
          <div class="assessment-toolbar">
            <button class="button button-primary button-compact" type="button" data-bias-assessment-new>Load another set</button>
            <a class="button button-secondary button-compact" href="../${siteConfig.sectionSlug}/">Study the full reference</a>
          </div>
          <div class="assessment-items" data-bias-assessment-items></div>
          <div class="assessment-actions">
            <button class="button button-primary" type="button" data-bias-assessment-grade>Grade this assessment</button>
          </div>
          <div class="detail-section assessment-results hidden" data-bias-assessment-results role="status" aria-live="polite"></div>
          <script id="bias-assessment-bank" type="application/json">${safeJsonForScript(payload)}</script>
          <noscript>
            <div class="note-panel" style="margin-top: 18px;">
              <h4>JavaScript is required for this assessment</h4>
              <p class="muted">This page builds a mixed scenario set in the browser. If scripting is disabled, you can still study the full reference in <a class="text-link" href="../${siteConfig.sectionSlug}/">All Biases</a>.</p>
            </div>
          </noscript>
        </section>`,
  });
}

function renderCaseStudiesPage() {
  return renderPage({
    title: "Case Studies",
    description: "A searchable library of sourced teaching cases showing where bias pressure becomes visible in practice.",
    prefix: "../",
    currentId: "case-studies",
    routePath: `/${caseStudySlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Case Studies" },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Case Studies</p>
          <h2 class="detail-title">A browsable library of bias teaching cases</h2>
          <p class="detail-deck">These examples are meant to teach visible bias pressure in live contexts, not to claim mind-reading certainty about every actor in every story. Use them to compare patterns, not to overdiagnose strangers from a distance.</p>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>How to use this page</h4>
            <p class="muted">Search by bias name, source, or scenario type. Filter by category when you know what kind of judgment failed, and by pattern when you want to compare hidden pulls across contexts.</p>
          </div>
          <div class="note-panel">
            <h4>Why the library matters</h4>
            <p class="muted">A strong bias site needs concrete public and everyday cases so the label does not stay trapped at the level of definition. Case libraries make comparison teachable.</p>
          </div>
        </div>

        <section class="section-block">
          <div class="note-panel search-panel">
            <div class="search-row search-row-compact">
              <input class="search-input" type="search" placeholder="Search case studies, sources, or linked biases..." aria-label="Search case studies" data-search-input />
              <select class="search-select" data-category-filter aria-label="Filter case studies by category">
                <option value="">All categories</option>
                ${tasks.map((task) => `<option value="${escapeHtml(task.name)}">${escapeHtml(task.name)}</option>`).join("")}
              </select>
              <select class="search-select" data-pattern-filter aria-label="Filter case studies by pattern">
                <option value="">All patterns</option>
                ${patterns.map((pattern) => `<option value="${escapeHtml(pattern.name)}">${escapeHtml(pattern.name)}</option>`).join("")}
              </select>
              <button class="search-reset" type="button" data-search-reset>Reset</button>
            </div>
            <div class="search-meta">
              <span data-search-count data-search-unit-singular="case study" data-search-unit-plural="case studies"></span>
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="category-grid">
            ${caseStudyLibrary.map((item) => renderCaseStudyCard(item, "../")).join("")}
          </div>
          <div class="note-panel hidden" data-search-empty>
            <h4>No case studies matched</h4>
            <p class="muted">Try a broader query, remove one filter, or search by a linked bias such as confirmation bias, survivorship bias, or halo effect.</p>
          </div>
        </section>`,
  });
}

function renderPromptsPage() {
  return renderPage({
    title: "Prompt Kits",
    description: "Bias-aware AI prompts for decisions, forecasts, postmortems, people judgment, and media review.",
    prefix: "../",
    currentId: "prompts",
    routePath: `/${siteConfig.promptSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Prompt Kits" },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Prompts</p>
          <h2 class="detail-title">Prompt kits for catching bias without outsourcing your judgment</h2>
          <p class="detail-deck">These are designed to make an AI model slow the structure of the reasoning process. The goal is not to let the model decide for you. The goal is to expose what your current process may be skipping.</p>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Best use</h4>
            <p class="muted">Use these after you have written the live decision, forecast, or case as concretely as possible. Vague prompts produce flattering but low-value outputs.</p>
          </div>
          <div class="note-panel">
            <h4>Important limit</h4>
            <p class="muted">A model can help surface missing comparisons, hidden defaults, or softened alternatives, but it can also confidently mirror your framing. The prompt should therefore widen the lens, not merely request a verdict.</p>
          </div>
        </div>

        <section class="section-block">
          <div class="category-grid">
            ${promptKitData.map((promptKit) => `<div id="${promptKit.slug}">${renderPromptCard(promptKit, "../")}</div>`).join("")}
          </div>
        </section>`,
  });
}

function renderTheoryPage() {
  return renderPage({
    title: "Theory",
    description: "Theory articles on taxonomy, pedagogy, calibration, and debiasing design for cognitive bias work.",
    prefix: "../",
    currentId: "theory",
    routePath: `/${siteConfig.theorySlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Theory" },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Theory</p>
          <h2 class="detail-title">Related articles on how to teach, compare, and interrupt biases well</h2>
          <p class="detail-deck">CogBias borrows LogFall's practical teaching instinct, but the underlying object is different. These articles explain how bias work differs from fallacy work, why debiasing is mainly a design problem, and how to teach calibration without turning the topic into jargon theater.</p>
        </section>

        <section class="section-block">
          <div class="category-grid theory-article-grid">
            ${theoryArticles.map((article) => renderTheoryArticleCard(article, "../")).join("")}
          </div>
        </section>`,
  });
}

function renderTheoryArticlePage(article) {
  return renderPage({
    title: article.title,
    description: article.summary,
    prefix: "../../",
    currentId: "theory",
    routePath: `/${siteConfig.theorySlug}/${article.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "Theory", href: "../" },
      { label: article.title },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Theory Article</p>
          <h2 class="detail-title">${escapeHtml(article.title)}</h2>
          <p class="detail-deck">${escapeHtml(article.summary)}</p>
          <p class="theory-article-intro">${escapeHtml(article.intro)}</p>
        </section>

        ${article.sections
          .map(
            (section) => `
              <section class="detail-section section-block theory-section">
                <h3 class="section-title">${escapeHtml(section.heading)}</h3>
                ${section.paragraphs.map((paragraph) => `<p class="muted">${escapeHtml(paragraph)}</p>`).join("")}
                ${
                  section.bullets?.length
                    ? `<ul class="muted">${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
                    : ""
                }
              </section>`,
          )
          .join("")}

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Related biases</h2>
              <p class="section-copy">Use these entry pages after the article if you want the same theory translated into more concrete diagnostic and repair tools.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${article.relatedEntries.map((entry) => renderBiasCard(entry, "../../")).join("")}
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
  const quickCheck = quickCheckFor(entry);
  const practiceLab = practiceLabFor(entry);
  const spotIt = entry.spotIt || fallbackSpotIt(entry);
  const slowIt = entry.slowIt || fallbackSlowIt(entry);
  const reframeIt = entry.reframeIt || fallbackReframeIt(entry);
  const examples = examplesFor(entry);
  const redFlags = redFlagsFor(entry);
  const reflectionQuestions = reflectionQuestionsFor(entry);
  const repairMoves = repairMovesFor(entry);
  const confusions = confusionsFor(entry);
  const caseStudies = caseStudiesFor(entry);
  const companionReading = companionReadingFor(entry);
  const paths = pathObjectsForEntry(entry);
  const checks = selfChecksForEntry(entry);
  const gauges = entry.teachingGauges || [];
  const promptKits = promptKitsForEntry(entry);

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
            <div class="path-link-row path-link-row-spaced">
              ${paths
                .map(
                  (path) =>
                    `<a class="path-link-chip" href="../../${siteConfig.pathSlug}/${path.slug}/">${escapeHtml(path.title)}</a>`,
                )
                .join("")}
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
            <h4>Quick check</h4>
            <p class="muted">${escapeHtml(quickCheck)}</p>
          </div>
          <div class="note-panel">
            <h4>Mechanism snapshot</h4>
            <p class="muted">${escapeHtml(entry.mechanism || "This bias changes what feels most plausible before the full evidence or decision process has been fairly inspected.")}</p>
          </div>
        </div>

        ${
          gauges.length
            ? `
        <section class="section-block gauge-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Teaching gauges</h2>
              <p class="section-copy">These are classroom-facing editorial estimates for comparing how the bias behaves in use. They are teaching aids, not measured statistics.</p>
            </div>
          </div>
          <div class="gauge-grid">
            ${gauges.map((gauge) => renderGaugeCard(gauge)).join("")}
          </div>
        </section>`
            : ""
        }

        ${
          entry.analogyClaim && entry.analogyResponse
            ? `
        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">That's like saying...</h2>
              <p class="section-copy">Analogies make the hidden shape of the distortion visible before the technical label has to do all the work.</p>
            </div>
          </div>
          <div class="analogy-grid">
            <article class="note-panel analogy-card analogy-claim-card">
              <p class="analogy-label">Biased move</p>
              <p class="analogy-text">${escapeHtml(entry.analogyClaim)}</p>
            </article>
            <article class="note-panel analogy-card analogy-response-card">
              <p class="analogy-label">Clearer comparison</p>
              <p class="analogy-text">${escapeHtml(entry.analogyResponse)}</p>
            </article>
          </div>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Caveat</h4>
            <p class="muted">${escapeHtml(entry.misuseWarning)}</p>
          </div>
          <div class="note-panel">
            <h4>Use the label only when...</h4>
            <p class="muted">${escapeHtml(entry.useLabelWhen)}</p>
          </div>
        </div>`
            : `
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
            <h4>Reference use</h4>
            <p class="muted">Use the quick check and reflection questions before locking the label. Nearby entries often share the same outer appearance while differing in what actually drives the distortion.</p>
          </div>
        </div>`
        }

        ${
          entry.analogyClaim && entry.analogyResponse
            ? `
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
            <h4>Reference use</h4>
            <p class="muted">Use the quick check, caveat, and nearby confusions together. The fastest diagnosis is often the noisiest one.</p>
          </div>
        </div>`
            : ""
        }

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Bias in the wild</h2>
              <p class="section-copy">Each example changes the surface context while keeping the same hidden distortion in place.</p>
            </div>
          </div>
          <div class="category-grid">
            <article class="category-card">
              <h3>Everyday life</h3>
              <p class="card-copy">${escapeHtml(examples.everyday)}</p>
            </article>
            <article class="category-card">
              <h3>Work and teams</h3>
              <p class="card-copy">${escapeHtml(examples.workplace)}</p>
            </article>
            <article class="category-card">
              <h3>Public discourse</h3>
              <p class="card-copy">${escapeHtml(examples.public)}</p>
            </article>
          </div>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>What it feels like from inside</h4>
            <p class="muted">${escapeHtml(
              entry.whatItFeelsLike ||
                "The distortion usually feels like ordinary good judgment from the inside, which is why procedural repairs matter more than mere recognition.",
            )}</p>
            <p class="muted"><strong>Teaching note:</strong> ${escapeHtml(teachingNoteFor(entry))}</p>
          </div>
          <div class="note-panel">
            <h4>Telltale signs</h4>
            <ul class="muted">
              ${redFlags.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </div>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Repair at three levels</h2>
              <p class="section-copy">The strongest debiasing moves change the process, not just the label.</p>
            </div>
          </div>
          <div class="category-grid">
            <article class="category-card">
              <h3>Solo move</h3>
              <p class="card-copy">${escapeHtml(repairMoves.solo)}</p>
            </article>
            <article class="category-card">
              <h3>Team move</h3>
              <p class="card-copy">${escapeHtml(repairMoves.team)}</p>
            </article>
            <article class="category-card">
              <h3>System move</h3>
              <p class="card-copy">${escapeHtml(repairMoves.system)}</p>
            </article>
          </div>
        </section>

        <section class="detail-section section-block">
          <p class="eyebrow">Practice And Repair</p>
          <h2 class="section-title">Follow the drift, then interrupt it</h2>
          <p class="section-copy">${escapeHtml(practiceLab.intro)}</p>
          <div class="category-grid">
            ${practiceLab.stages
              .map(
                (stage) => `
                  <article class="category-card">
                    <h3>${escapeHtml(stage.title)}</h3>
                    <p class="card-copy">${escapeHtml(stage.text)}</p>
                  </article>`,
              )
              .join("")}
          </div>
          <div class="note-panel" style="margin-top: 18px;">
            <h4>Repair question</h4>
            <p class="muted">${escapeHtml(practiceLab.repairQuestion)}</p>
          </div>
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
              <h2 class="section-title">Often confused with</h2>
              <p class="section-copy">These are nearby labels that can look similar on first pass but deserve a cleaner distinction.</p>
            </div>
          </div>
          <div class="category-grid">
            ${confusions
              .map(
                (item) => `
                  <article class="category-card">
                    <h3><a href="../../${siteConfig.sectionSlug}/${item.entry.slug}/">${escapeHtml(item.entry.name)}</a></h3>
                    <p class="card-copy">${escapeHtml(item.note)}</p>
                  </article>`,
              )
              .join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Reflection questions</h2>
              <p class="section-copy">These are useful when the label seems roughly right but the process change still feels underspecified.</p>
            </div>
          </div>
          <div class="category-grid">
            ${reflectionQuestions
              .map(
                (question) => `
                  <article class="category-card">
                    <p class="card-copy">${escapeHtml(question)}</p>
                  </article>`,
              )
              .join("")}
          </div>
        </section>

        ${
          caseStudies.length
            ? `
        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Case studies</h2>
              <p class="section-copy">These sourced cases do not prove what was in someone's head with perfect certainty. They are teaching cases for showing where the bias pressure becomes visible in practice.</p>
            </div>
            <a class="inline-link" href="../../${caseStudySlug}/?q=${encodeURIComponent(entry.name)}">View related cases</a>
          </div>
          <div class="case-list">
            ${caseStudies
              .map(
                (item) => `
                  <article class="case-item">
                    <p class="case-title"><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></p>
                    <p class="case-summary">${escapeHtml(item.summary)}</p>
                    <p class="case-summary muted"><strong>Why it fits:</strong> ${escapeHtml(item.whyItFits)}</p>
                    <p class="case-source">${escapeHtml(item.source)}${item.year ? ` · ${escapeHtml(item.year)}` : ""}</p>
                  </article>`,
              )
              .join("")}
          </div>
        </section>`
            : ""
        }

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Use it in context</h2>
              <p class="section-copy">Once you know the bias, these nearby tools help you use the page in a real workflow rather than as a static definition.</p>
            </div>
          </div>
          <div class="category-grid">
            <article class="category-card">
              <h3>Learning paths</h3>
              <p class="card-copy">Curated sequences where this bias commonly appears alongside a few predictable neighbors.</p>
              <div class="path-link-row">
                ${paths
                  .map(
                    (path) =>
                      `<a class="path-link-chip" href="../../${siteConfig.pathSlug}/${path.slug}/">${escapeHtml(path.title)}</a>`,
                  )
                  .join("")}
              </div>
            </article>
            <article class="category-card">
              <h3>Self-checks</h3>
              <p class="card-copy">Short audits you can run before the distortion hardens into a decision, a verdict, or a post-hoc story.</p>
              <div class="path-link-row">
                ${checks
                  .map(
                    (check) =>
                      `<a class="path-link-chip" href="../../${siteConfig.checkSlug}/#${check.slug}">${escapeHtml(check.title)}</a>`,
                  )
                  .join("")}
              </div>
            </article>
            <article class="category-card">
              <h3>Prompt kits</h3>
              <p class="card-copy">Bias-aware AI prompts that widen the frame instead of simply endorsing the first preferred conclusion.</p>
              <div class="path-link-row">
                ${promptKits
                  .map(
                    (promptKit) =>
                      `<a class="path-link-chip" href="../../${siteConfig.promptSlug}/#${promptKit.slug}">${escapeHtml(promptKit.title)}</a>`,
                  )
                  .join("")}
              </div>
            </article>
            <article class="category-card">
              <h3>Assessment</h3>
              <p class="card-copy">A mixed scenario set that can quietly pull this bias into the question bank without announcing the answer in the title first.</p>
              <div class="path-link-row">
                <a class="path-link-chip" href="../../${siteConfig.assessmentSlug}/?focus=${entry.slug}">Open a mixed assessment set that includes this bias</a>
              </div>
            </article>
          </div>
        </section>

        ${
          companionReading.length
            ? `
        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Companion reading</h2>
              <p class="section-copy">These links widen the frame around the bias without interrupting the core lesson on this page.</p>
            </div>
          </div>
          <div class="category-grid">
            ${companionReading
              .map(
                (item) => `
                  <article class="category-card">
                    <h3><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></h3>
                    <p class="card-copy">${escapeHtml(item.why)}</p>
                    <p class="muted">${escapeHtml(item.source)}</p>
                  </article>`,
              )
              .join("")}
          </div>
        </section>`
            : ""
        }

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
    description: "How CogBias uses a Wikipedia seed taxonomy while growing into a fuller teaching resource.",
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
          <h2 class="detail-title">Wide taxonomy first, then richer guided use</h2>
          <p class="detail-deck">CogBias begins with the Wikipedia cognitive-bias list as a wide seed taxonomy, then reshapes that material into a teaching-first site with paths, self-audits, prompt kits, theory notes, and deeper editorial treatment of especially important bias pages.</p>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Why this architecture works</h4>
            <p class="muted">The site can now grow in three directions at once: broader coverage through the imported catalog, deeper coverage through hand-authored upgrades, and stronger usability through path pages and procedural tools.</p>
          </div>
          <div class="note-panel">
            <h4>Files to edit first</h4>
            <ul class="muted">
              <li><code>data/site.json</code> for branding, featured entries, taxonomy copy, and countermoves.</li>
              <li><code>data/biases.json</code> for generated coverage.</li>
              <li><code>data/editorial_enrichments*.json</code> for richer hand-authored entry sections.</li>
              <li><code>data/entry_teaching_modules*.json</code> and <code>data/assessment_bank*.json</code> for flagship-page pedagogy and the mixed assessment runner.</li>
              <li><code>data/learning_paths*.json</code>, <code>data/self_checks*.json</code>, <code>data/prompt_kits*.json</code>, and <code>data/theory_articles*.json</code> for the guided layers.</li>
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
    siteConfig.pathSlug,
    siteConfig.checkSlug,
    siteConfig.assessmentSlug,
    caseStudySlug,
    siteConfig.promptSlug,
    siteConfig.theorySlug,
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
  await writeTextFile(`${siteConfig.pathSlug}/index.html`, renderPathsIndexPage());
  await writeTextFile(`${siteConfig.checkSlug}/index.html`, renderCheckYourselfPage());
  await writeTextFile(`${siteConfig.assessmentSlug}/index.html`, renderAssessmentPage());
  await writeTextFile(`${caseStudySlug}/index.html`, renderCaseStudiesPage());
  await writeTextFile(`${siteConfig.promptSlug}/index.html`, renderPromptsPage());
  await writeTextFile(`${siteConfig.theorySlug}/index.html`, renderTheoryPage());
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

  for (const path of learningPaths) {
    await writeTextFile(`${siteConfig.pathSlug}/${path.slug}/index.html`, renderPathDetailPage(path));
  }

  for (const article of theoryArticles) {
    await writeTextFile(`${siteConfig.theorySlug}/${article.slug}/index.html`, renderTheoryArticlePage(article));
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
      `/${siteConfig.pathSlug}/`,
      `/${siteConfig.checkSlug}/`,
      `/${siteConfig.assessmentSlug}/`,
      `/${caseStudySlug}/`,
      `/${siteConfig.promptSlug}/`,
      `/${siteConfig.theorySlug}/`,
      "/countermoves/",
      "/about/",
      ...entries.map((entry) => `/${siteConfig.sectionSlug}/${entry.slug}/`),
      ...tasks.map((task) => `/categories/${task.slug}/`),
      ...patterns.map((pattern) => `/${siteConfig.patternSlug}/${pattern.slug}/`),
      ...learningPaths.map((path) => `/${siteConfig.pathSlug}/${path.slug}/`),
      ...theoryArticles.map((article) => `/${siteConfig.theorySlug}/${article.slug}/`),
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
