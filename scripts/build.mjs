import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "data");
const siteDir = path.join(projectRoot, "site");
const assetsDirName = "assets";
const biasPosterDirName = `${assetsDirName}/bias-posters`;
const brandDirName = "brand";
const brandMarkPath = `${brandDirName}/cogbias-mark.svg`;
const faviconSvgPath = brandMarkPath;
const faviconIcoPath = `${brandDirName}/favicon.ico`;
const favicon16Path = `${brandDirName}/favicon-16x16.png`;
const favicon32Path = `${brandDirName}/favicon-32x32.png`;
const appleTouchIconPath = `${brandDirName}/apple-touch-icon.png`;
const androidChrome192Path = `${brandDirName}/android-chrome-192x192.png`;
const androidChrome512Path = `${brandDirName}/android-chrome-512x512.png`;

const curriculumTracks = [
  {
    slug: "foundational",
    order: 1,
    name: "Foundational",
    summary: "Start here if you want the core labels, the most reusable distinctions, and the first debiasing moves.",
  },
  {
    slug: "applied",
    order: 2,
    name: "Applied",
    summary: "Use these when the real job is forecasting, postmortems, moderation, or other live judgment work.",
  },
  {
    slug: "teaching",
    order: 3,
    name: "Teaching And Team Use",
    summary: "Best for facilitation, workflow design, coaching, and group decision settings where room structure matters.",
  },
];

const assessmentDifficulties = [
  {
    slug: "foundational",
    order: 1,
    name: "Foundational",
    summary: "Clearer first-pass cases for learning the major families and repair moves.",
  },
  {
    slug: "applied",
    order: 2,
    name: "Applied",
    summary: "Messier real-world cases where the right label and the right repair can come apart.",
  },
  {
    slug: "advanced",
    order: 3,
    name: "Advanced",
    summary: "Meta-bias, overlap, and interpretation-heavy scenarios for stronger readers and classrooms.",
  },
];

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

async function readBiasPosterSlugs() {
  try {
    const fileNames = await fs.readdir(path.join(siteDir, biasPosterDirName));
    return new Set(
      fileNames
        .map((fileName) => fileName.match(/^bias-(.+)-poster\.jpg$/)?.[1])
        .filter(Boolean),
    );
  } catch (error) {
    if (error.code === "ENOENT") return new Set();
    throw error;
  }
}

const siteConfig = await readJsonFile("site.json");
const biasPosterSlugs = await readBiasPosterSlugs();
const rawEntries = await readJsonFile("biases.json");
const biasCardSummaryOverrides = await readJsonFile("bias_card_summaries.json");
const biasIllustrationCaptions = await readJsonFile("bias_illustration_captions.json");
const editorialEnrichments = await readJsonArraySeries("editorial_enrichments");
const teachingModules = await readJsonArraySeries("entry_teaching_modules");
const entrySourceData = await readJsonArraySeries("entry_sources");
const learningPathData = await readJsonArraySeries("learning_paths");
const pathCurriculumData = await readJsonArraySeries("path_curriculum");
const selfCheckData = await readJsonArraySeries("self_checks");
const selfCheckCurriculumData = await readJsonArraySeries("self_check_curriculum");
const domainHubData = await readJsonArraySeries("domain_hubs");
const assessmentBankData = await readJsonArraySeries("assessment_bank");
const assessmentMetadataData = await readJsonArraySeries("assessment_metadata");
const comparisonGuideData = await readJsonArraySeries("comparison_guides");
const teachingKitData = await readJsonArraySeries("teaching_kits");
const promptKitData = await readJsonArraySeries("prompt_kits");
const theoryArticleData = await readJsonArraySeries("theory_articles");

const curriculumTrackBySlug = new Map(curriculumTracks.map((track) => [track.slug, track]));
const assessmentDifficultyBySlug = new Map(
  assessmentDifficulties.map((difficulty) => [difficulty.slug, difficulty]),
);

function mergeUniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function mergeUniqueObjects(values = [], keyForItem) {
  const merged = new Map();

  for (const item of values.filter(Boolean)) {
    const key = keyForItem(item);
    const prior = merged.get(key);
    merged.set(key, prior ? { ...prior, ...item } : item);
  }

  return [...merged.values()];
}

function mergeEntryOverlay(base = {}, overlay = {}) {
  const merged = { ...base, ...overlay };

  if (base.aliases || overlay.aliases) {
    merged.aliases = mergeUniqueStrings([...(base.aliases || []), ...(overlay.aliases || [])]);
  }

  if (base.related || overlay.related) {
    merged.related = mergeUniqueStrings([...(base.related || []), ...(overlay.related || [])]);
  }

  if (base.confusions || overlay.confusions) {
    merged.confusions = mergeUniqueObjects(
      [...(base.confusions || []), ...(overlay.confusions || [])],
      (item) => item.slug || item.name || item.note || JSON.stringify(item),
    );
  }

  if (base.caseStudies || overlay.caseStudies) {
    merged.caseStudies = mergeUniqueObjects(
      [...(base.caseStudies || []), ...(overlay.caseStudies || [])],
      (item) => `${String(item.url || "").trim().toLowerCase()}::${String(item.title || "").trim().toLowerCase()}`,
    );
  }

  if (base.sourceTrail || overlay.sourceTrail) {
    merged.sourceTrail = mergeUniqueObjects(
      [...(base.sourceTrail || []), ...(overlay.sourceTrail || [])],
      (item) => `${String(item.url || "").trim().toLowerCase()}::${String(item.title || "").trim().toLowerCase()}::${String(item.source || "").trim().toLowerCase()}`,
    );
  }

  return merged;
}

function sortByTrackAndSequence(left, right) {
  const leftTrack = curriculumTrackBySlug.get(left.track || "")?.order || Number.POSITIVE_INFINITY;
  const rightTrack = curriculumTrackBySlug.get(right.track || "")?.order || Number.POSITIVE_INFINITY;
  return (
    leftTrack - rightTrack ||
    Number(left.sequence || Number.POSITIVE_INFINITY) - Number(right.sequence || Number.POSITIVE_INFINITY) ||
    String(left.title || left.slug || "").localeCompare(String(right.title || right.slug || ""))
  );
}

function mergeEntryData(baseEntries, enrichments) {
  const enrichmentsBySlug = new Map();

  for (const enrichment of enrichments) {
    enrichmentsBySlug.set(
      enrichment.slug,
      mergeEntryOverlay(enrichmentsBySlug.get(enrichment.slug) || {}, enrichment),
    );
  }

  return baseEntries.map((entry) => {
    const enrichment = enrichmentsBySlug.get(entry.slug);
    if (!enrichment) return entry;
    return mergeEntryOverlay(entry, enrichment);
  });
}

function normalizeBiasCardSummary(summary) {
  let text = String(summary || "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cutoffPatterns = [
    /Also known as\b/i,
    /The opposite bias\b/i,
    /See also\b/i,
    /For example\b/i,
    /An example of this is\b/i,
    /People are more likely\b/i,
    /In other words\b/i,
    /It was named after\b/i,
    /Also recency bias\b/i,
  ];

  for (const pattern of cutoffPatterns) {
    const match = text.match(pattern);
    if (match?.index != null) {
      text = text.slice(0, match.index).trim();
    }
  }

  text = text
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const firstSentence = text.split(/(?<=[.?!])\s+/)[0]?.trim();
  text = firstSentence || text;

  text = text
    .replace(/^A person's tendency to /i, "The tendency to ")
    .replace(/^A tendency for people to /i, "The tendency to ")
    .replace(/^A tendency to /i, "The tendency to ")
    .replace(/^The tendency,?\s+/i, "The tendency ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

  if (text && !/[.?!]$/.test(text)) {
    text += ".";
  }

  return text;
}

function buildBiasCardSummary(entry) {
  return (
    entry.cardSummary ||
    biasCardSummaryOverrides[entry.slug] ||
    normalizeBiasCardSummary(entry.summary || "")
  );
}

function illustrationCaptionFor(entry) {
  return (
    biasIllustrationCaptions[entry.slug] ||
    `A vintage teaching poster for ${entry.name}, built to make the bias visible before the technical label has to do all the work.`
  );
}

const entries = mergeEntryData(
  mergeEntryData(mergeEntryData(rawEntries, editorialEnrichments), teachingModules),
  entrySourceData,
).map((entry) => ({
  ...entry,
  cardSummary: buildBiasCardSummary(entry),
  illustrationCaption: illustrationCaptionFor(entry),
}));
const caseStudySlug = siteConfig.caseStudySlug || "case-studies";
const domainHubSlug = siteConfig.domainHubSlug || "contexts";
const comparisonGuideSlug = siteConfig.comparisonGuideSlug || "compare";
const teachingKitSlug = siteConfig.teachingKitSlug || "teaching-kits";
const coverageSlug = siteConfig.coverageSlug || "coverage";
const biasMapSlug = siteConfig.biasMapSlug || "map";
const pathCurriculumBySlug = new Map(pathCurriculumData.map((item) => [item.slug, item]));
const selfCheckCurriculumBySlug = new Map(selfCheckCurriculumData.map((item) => [item.slug, item]));
const assessmentMetadataById = new Map(assessmentMetadataData.map((item) => [item.id, item]));

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

const categoryPalette = ["#2f82c2", "#f5b700", "#178f70", "#df7b35", "#6f72d8", "#c64f7a", "#0f766e", "#a16207"];
const categoryColors = new Map(tasks.map((task, index) => [task.name, categoryPalette[index % categoryPalette.length]]));

const biasMapDimensions = [
  { slug: "common", label: "Common in context", low: "Rare", high: "Frequent" },
  { slug: "spot", label: "Easy to spot from outside", low: "Hidden", high: "Obvious" },
  { slug: "commit", label: "Easy to innocently commit", low: "Low risk", high: "Easy slip" },
  { slug: "teaching", label: "Teaching difficulty", low: "Foundational", high: "Advanced" },
];

function findTeachingGauge(entry, label) {
  const normalizedLabel = String(label || "").trim().toLowerCase();
  return (entry.teachingGauges || []).find((gauge) => String(gauge.label || "").trim().toLowerCase() === normalizedLabel);
}

function findBiasMapGauge(entry, dimension) {
  if (dimension.slug === "common") {
    return (entry.teachingGauges || []).find((gauge) => String(gauge.label || "").trim().toLowerCase().startsWith("common in "));
  }

  return findTeachingGauge(entry, dimension.label);
}

function buildBiasMapPoints() {
  return entries
    .map((entry) => {
      const category = (entry.tasks || [])[0] || "Uncategorized";
      const categoryMeta = taskByName.get(category);
      const dimensions = Object.fromEntries(
        biasMapDimensions
          .map((dimension) => {
            const gauge = findBiasMapGauge(entry, dimension);
            const value = Number(gauge?.value);

            if (!Number.isFinite(value)) return null;

            return [
              dimension.slug,
              {
                value,
                label: gauge?.label || dimension.label,
                low: gauge?.low || dimension.low,
                high: gauge?.high || dimension.high,
                note: gauge?.note || "",
              },
            ];
          })
          .filter(Boolean),
      );

      if (Object.keys(dimensions).length < 2) return null;

      return {
        slug: entry.slug,
        name: entry.name,
        href: `${siteConfig.sectionSlug}/${entry.slug}/`,
        category,
        categorySlug: categoryMeta?.slug || "",
        color: categoryColors.get(category) || "#54728b",
        summary: entry.cardSummary || entry.summary || "",
        dimensions,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));
}

const patterns = siteConfig.patterns
  .map((pattern) => ({
    ...pattern,
    members: entries.filter((entry) => (entry.patterns || []).includes(pattern.name)),
  }))
  .filter((pattern) => pattern.members.length > 0);

const learningPaths = learningPathData
  .map((path) => {
    const curriculum = pathCurriculumBySlug.get(path.slug) || {};
    return {
      ...path,
      ...curriculum,
      trackMeta: curriculumTrackBySlug.get(curriculum.track || "applied") || curriculumTracks[1],
      members: (path.biasSlugs || []).map((slug) => entryBySlug.get(slug)).filter(Boolean),
    };
  })
  .sort(sortByTrackAndSequence);

const selfChecks = selfCheckData
  .map((check) => {
    const curriculum = selfCheckCurriculumBySlug.get(check.slug) || {};
    return {
      ...check,
      ...curriculum,
      trackMeta: curriculumTrackBySlug.get(curriculum.track || "applied") || curriculumTracks[1],
    };
  })
  .sort(sortByTrackAndSequence);

const pathBySlug = new Map(learningPaths.map((path) => [path.slug, path]));
const selfCheckBySlug = new Map(selfChecks.map((check) => [check.slug, check]));
const promptKitBySlug = new Map(promptKitData.map((promptKit) => [promptKit.slug, promptKit]));

const domainHubs = domainHubData.map((hub) => ({
  ...hub,
  entries: (hub.biasSlugs || []).map((slug) => entryBySlug.get(slug)).filter(Boolean),
  paths: (hub.pathSlugs || []).map((slug) => pathBySlug.get(slug)).filter(Boolean),
  selfChecks: (hub.selfCheckSlugs || []).map((slug) => selfCheckBySlug.get(slug)).filter(Boolean),
  promptKits: (hub.promptSlugs || []).map((slug) => promptKitBySlug.get(slug)).filter(Boolean),
}));
const domainHubBySlug = new Map(domainHubs.map((hub) => [hub.slug, hub]));

const assessmentBank = assessmentBankData.map((item) => {
  const metadata = assessmentMetadataById.get(item.id) || {};
  const correctEntry = entryBySlug.get(item.correctBias);
  const difficulty = metadata.difficulty || "applied";
  const contextHubs = domainHubs
    .filter((hub) => (hub.biasSlugs || []).includes(item.correctBias))
    .map((hub) => ({ slug: hub.slug, title: hub.title }));
  return {
    ...item,
    ...metadata,
    difficulty,
    difficultyMeta: assessmentDifficultyBySlug.get(difficulty) || assessmentDifficulties[1],
    categories: [...(correctEntry?.tasks || [])],
    patterns: [...(correctEntry?.patterns || [])],
    contexts: contextHubs,
  };
});

const comparisonGuides = comparisonGuideData.map((guide) => ({
  ...guide,
  entries: (guide.biasSlugs || []).map((slug) => entryBySlug.get(slug)).filter(Boolean),
}));
const comparisonGuideBySlug = new Map(comparisonGuides.map((guide) => [guide.slug, guide]));

const teachingKits = teachingKitData.map((kit) => ({
  ...kit,
  hub: domainHubBySlug.get(kit.contextSlug),
  entries: (kit.biasSlugs || []).map((slug) => entryBySlug.get(slug)).filter(Boolean),
  paths: (kit.pathSlugs || []).map((slug) => pathBySlug.get(slug)).filter(Boolean),
  selfChecks: (kit.selfCheckSlugs || []).map((slug) => selfCheckBySlug.get(slug)).filter(Boolean),
  comparisons: (kit.comparisonSlugs || []).map((slug) => comparisonGuideBySlug.get(slug)).filter(Boolean),
}));
const teachingKitBySlug = new Map(teachingKits.map((kit) => [kit.slug, kit]));

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

for (const item of entrySourceData) {
  if (!entryBySlug.has(item.slug)) {
    throw new Error(`Unknown entry source slug "${item.slug}".`);
  }
}

for (const item of pathCurriculumData) {
  if (!(learningPathData || []).some((path) => path.slug === item.slug)) {
    throw new Error(`Unknown path curriculum slug "${item.slug}".`);
  }
}

for (const item of selfCheckCurriculumData) {
  if (!(selfCheckData || []).some((check) => check.slug === item.slug)) {
    throw new Error(`Unknown self-check curriculum slug "${item.slug}".`);
  }
}

for (const item of assessmentMetadataData) {
  if (!(assessmentBankData || []).some((question) => question.id === item.id)) {
    throw new Error(`Unknown assessment metadata id "${item.id}".`);
  }
}

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

  if (path.track && !curriculumTrackBySlug.has(path.track)) {
    throw new Error(`Unknown curriculum track "${path.track}" on path "${path.slug}".`);
  }

  for (const slug of path.recommendedCheckSlugs || []) {
    if (!selfCheckBySlug.has(slug)) {
      throw new Error(`Unknown recommended self-check slug "${slug}" on path "${path.slug}".`);
    }
  }

  for (const slug of path.nextPathSlugs || []) {
    if (!pathBySlug.has(slug)) {
      throw new Error(`Unknown next path slug "${slug}" on path "${path.slug}".`);
    }
  }
}

const seenCheckSlugs = new Set();
for (const check of selfChecks) {
  if (seenCheckSlugs.has(check.slug)) {
    throw new Error(`Duplicate self-check slug "${check.slug}".`);
  }
  seenCheckSlugs.add(check.slug);

  for (const slug of check.relatedBiases || []) {
    if (!entryBySlug.has(slug)) {
      throw new Error(`Unknown self-check related slug "${slug}" on "${check.slug}".`);
    }
  }

  if (check.track && !curriculumTrackBySlug.has(check.track)) {
    throw new Error(`Unknown curriculum track "${check.track}" on self-check "${check.slug}".`);
  }

  for (const slug of check.pathSlugs || []) {
    if (!pathBySlug.has(slug)) {
      throw new Error(`Unknown path slug "${slug}" on self-check "${check.slug}".`);
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

const seenDomainHubSlugs = new Set();
for (const hub of domainHubs) {
  if (seenDomainHubSlugs.has(hub.slug)) {
    throw new Error(`Duplicate domain hub slug "${hub.slug}".`);
  }
  seenDomainHubSlugs.add(hub.slug);

  for (const slug of hub.biasSlugs || []) {
    if (!entryBySlug.has(slug)) {
      throw new Error(`Unknown domain hub bias slug "${slug}" on "${hub.slug}".`);
    }
  }

  for (const slug of hub.pathSlugs || []) {
    if (!pathBySlug.has(slug)) {
      throw new Error(`Unknown domain hub path slug "${slug}" on "${hub.slug}".`);
    }
  }

  for (const slug of hub.selfCheckSlugs || []) {
    if (!selfCheckBySlug.has(slug)) {
      throw new Error(`Unknown domain hub self-check slug "${slug}" on "${hub.slug}".`);
    }
  }

  for (const slug of hub.promptSlugs || []) {
    if (!promptKitBySlug.has(slug)) {
      throw new Error(`Unknown domain hub prompt slug "${slug}" on "${hub.slug}".`);
    }
  }
}

const seenComparisonGuideSlugs = new Set();
for (const guide of comparisonGuides) {
  if (seenComparisonGuideSlugs.has(guide.slug)) {
    throw new Error(`Duplicate comparison guide slug "${guide.slug}".`);
  }
  seenComparisonGuideSlugs.add(guide.slug);

  if ((guide.biasSlugs || []).length < 2) {
    throw new Error(`Comparison guide "${guide.slug}" must compare at least two biases.`);
  }

  for (const slug of guide.biasSlugs || []) {
    if (!entryBySlug.has(slug)) {
      throw new Error(`Unknown comparison guide bias slug "${slug}" on "${guide.slug}".`);
    }
  }
}

const seenTeachingKitSlugs = new Set();
for (const kit of teachingKits) {
  if (seenTeachingKitSlugs.has(kit.slug)) {
    throw new Error(`Duplicate teaching kit slug "${kit.slug}".`);
  }
  seenTeachingKitSlugs.add(kit.slug);

  if (kit.contextSlug && !domainHubBySlug.has(kit.contextSlug)) {
    throw new Error(`Unknown teaching kit context slug "${kit.contextSlug}" on "${kit.slug}".`);
  }

  for (const slug of kit.biasSlugs || []) {
    if (!entryBySlug.has(slug)) {
      throw new Error(`Unknown teaching kit bias slug "${slug}" on "${kit.slug}".`);
    }
  }

  for (const slug of kit.pathSlugs || []) {
    if (!pathBySlug.has(slug)) {
      throw new Error(`Unknown teaching kit path slug "${slug}" on "${kit.slug}".`);
    }
  }

  for (const slug of kit.selfCheckSlugs || []) {
    if (!selfCheckBySlug.has(slug)) {
      throw new Error(`Unknown teaching kit self-check slug "${slug}" on "${kit.slug}".`);
    }
  }

  for (const slug of kit.comparisonSlugs || []) {
    if (!comparisonGuideBySlug.has(slug)) {
      throw new Error(`Unknown teaching kit comparison slug "${slug}" on "${kit.slug}".`);
    }
  }

  if (kit.assessmentContext && !domainHubBySlug.has(kit.assessmentContext)) {
    throw new Error(`Unknown teaching kit assessment context "${kit.assessmentContext}" on "${kit.slug}".`);
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
for (const item of assessmentBank) {
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

  if (item.difficulty && !assessmentDifficultyBySlug.has(item.difficulty)) {
    throw new Error(`Unknown assessment difficulty "${item.difficulty}" on "${item.id}".`);
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
    <link rel="icon" href="${prefix}${faviconIcoPath}" sizes="any" />
    <link rel="icon" type="image/svg+xml" href="${prefix}${faviconSvgPath}" />
    <link rel="icon" type="image/png" sizes="32x32" href="${prefix}${favicon32Path}" />
    <link rel="icon" type="image/png" sizes="16x16" href="${prefix}${favicon16Path}" />
    <link rel="apple-touch-icon" sizes="180x180" href="${prefix}${appleTouchIconPath}" />
    <link rel="manifest" href="${prefix}site.webmanifest" />
    <link rel="stylesheet" href="${prefix}styles.css" />
    <script defer src="${prefix}app.js"></script>`;
}

function renderNav(prefix, currentId) {
  const navItems = [
    { id: "home", label: "Home", href: `${prefix}` || "./" },
    { id: "biases", label: "All Biases", href: `${prefix}${siteConfig.sectionSlug}/` },
    { id: "categories", label: "Categories", href: `${prefix}categories/` },
    { id: "contexts", label: "Contexts", href: `${prefix}${domainHubSlug}/` },
    { id: "map", label: "Map", href: `${prefix}${biasMapSlug}/` },
    { id: "compare", label: "Compare", href: `${prefix}${comparisonGuideSlug}/` },
    { id: "kits", label: "Kits", href: `${prefix}${teachingKitSlug}/` },
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
              <img class="brand-logo" src="${prefix}${brandMarkPath}" alt="" width="78" height="78" />
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
          <p class="footer-note">Last build: ${escapeHtml(buildDate)}. ${escapeHtml(siteConfig.copyrightNotice)}</p>
        </div>
      </footer>`;
}

function renderPage({ title, description, prefix, currentId, breadcrumbs, body, routePath, bodyClass = "" }) {
  const bodyClassAttr = bodyClass ? ` class="${escapeHtml(bodyClass)}"` : "";
  return `<!doctype html>
<html lang="en">
  <head>
${renderHead({ title, description, prefix, routePath })}
  </head>
  <body${bodyClassAttr}>
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
  return selfChecks.filter((check) => (check.relatedBiases || []).includes(entry.slug));
}

function promptKitsForEntry(entry) {
  return promptKitData.filter((promptKit) => (promptKit.relatedBiases || []).includes(entry.slug));
}

function theoryArticlesForEntry(entry, limit = 3) {
  return theoryArticles.filter((article) => (article.relatedBiases || []).includes(entry.slug)).slice(0, limit);
}

function comparisonGuidesForEntry(entry, limit = 3) {
  return comparisonGuides.filter((guide) => (guide.biasSlugs || []).includes(entry.slug)).slice(0, limit);
}

function teachingKitsForEntry(entry, limit = 3) {
  return teachingKits.filter((kit) => (kit.biasSlugs || []).includes(entry.slug)).slice(0, limit);
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

function sourceTrailFor(entry, { includeSeed = true } = {}) {
  const sources = [...(entry.sourceTrail || [])];

  if (includeSeed) {
    sources.push({
      kind: "Seed taxonomy",
      title: `${entry.name} reference article`,
      source: entry.sourceLabel || "Wikipedia",
      year: "",
      href: entry.sourceUrl || "https://en.wikipedia.org/wiki/List_of_cognitive_biases",
      note:
        siteConfig.sourceAttribution ||
        "Seed taxonomy and broad coverage are drawn from Wikipedia's List of cognitive biases.",
    });
  }

  const seen = new Set();
  return sources.filter((item) => {
    const key = `${String(item.href || "").trim().toLowerCase()}::${String(item.title || "").trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function theorySourceTrailFor(article) {
  const curated = [];
  const seen = new Set();

  for (const entry of article.relatedEntries || []) {
    for (const source of sourceTrailFor(entry, { includeSeed: false })) {
      const key = `${String(source.href || "").trim().toLowerCase()}::${String(source.title || "").trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      curated.push({
        ...source,
        relatedEntry: entry,
        note:
          source.note ||
          `Companion empirical anchor pulled in from the ${entry.name} entry page.`,
      });
    }
  }

  if (curated.length) return curated.slice(0, 6);

  for (const entry of article.relatedEntries || []) {
    for (const source of sourceTrailFor(entry)) {
      const key = `${String(source.href || "").trim().toLowerCase()}::${String(source.title || "").trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      curated.push({
        ...source,
        relatedEntry: entry,
      });
    }
  }

  return curated.slice(0, 6);
}

function companionReadingFor(entry) {
  const relatedTheory = theoryArticlesForEntry(entry, 2).map((article) => ({
    title: article.title,
    source: "CogBias theory",
    href: `../../${siteConfig.theorySlug}/${article.slug}/`,
    why: article.summary,
  }));

  return relatedTheory;
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

function renderPathLinkChips(slugs = [], prefix = "") {
  return slugs
    .map((slug) => pathBySlug.get(slug))
    .filter(Boolean)
    .map(
      (path) =>
        `<a class="path-link-chip" href="${prefix}${siteConfig.pathSlug}/${path.slug}/">${escapeHtml(path.title)}</a>`,
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

function biasPosterPath(entry) {
  return `${biasPosterDirName}/bias-${entry.slug}-poster.jpg`;
}

function hasBiasPoster(entry) {
  return biasPosterSlugs.has(entry.slug);
}

function renderBiasPosterImage(entry, prefix = "", className = "bias-poster-image", eager = false) {
  const loading = eager ? "eager" : "lazy";
  const fetchPriority = eager ? ' fetchpriority="high"' : "";
  return `<img class="${className}" src="${prefix}${biasPosterPath(entry)}" alt="Poster illustration for ${escapeHtml(entry.name)}" width="768" height="1152" loading="${loading}" decoding="async"${fetchPriority} />`;
}

function renderDetailIllustration(entry) {
  if (!hasBiasPoster(entry)) {
    return `
            <div class="illustration-placeholder">
              <p class="illustration-placeholder-kicker">${escapeHtml(siteConfig.illustrationPlaceholderTitle)}</p>
              <div class="illustration-placeholder-art" aria-hidden="true">
                <div class="illustration-ring"></div>
                <div class="illustration-grid-mark"></div>
              </div>
              <p class="muted">${escapeHtml(siteConfig.illustrationPlaceholderBody)}</p>
            </div>`;
  }

  return `
            <figure class="detail-illustration-shell">
              ${renderBiasPosterImage(entry, "../../", "detail-illustration-image", true)}
              <figcaption class="detail-illustration-copy">
                <p class="detail-illustration-label">Featured Illustration</p>
                <p class="detail-illustration-text">${escapeHtml(entry.illustrationCaption)}</p>
              </figcaption>
            </figure>`;
}

function renderBiasCard(entry, prefix = "") {
  const poster = hasBiasPoster(entry)
    ? `<a class="entry-card-visual" href="${prefix}${siteConfig.sectionSlug}/${entry.slug}/" aria-label="Open ${escapeHtml(entry.name)}">
                ${renderBiasPosterImage(entry, prefix, "entry-card-image")}
              </a>`
    : "";

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
                entry.cardSummary,
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
            ${poster}
            <h3><a href="${prefix}${siteConfig.sectionSlug}/${entry.slug}/">${escapeHtml(entry.name)}</a></h3>
            <p class="card-copy">${escapeHtml(entry.cardSummary || entry.summary)}</p>
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
  const estimatedTime = path.estimatedMinutes ? `${path.estimatedMinutes} min` : "";
  return `
          <article class="category-card">
            <h3><a href="${prefix}${siteConfig.pathSlug}/${path.slug}/">${escapeHtml(path.title)}</a></h3>
            <p class="card-copy">${escapeHtml(path.summary)}</p>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${path.members.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
              <span class="teaching-pill">${escapeHtml(path.trackMeta?.name || "Applied")}</span>
              ${estimatedTime ? `<span class="teaching-pill">${escapeHtml(estimatedTime)}</span>` : ""}
            </div>
            <p class="muted">${escapeHtml(path.guidingQuestion)}</p>
            <p class="muted">${escapeHtml(path.audience)}</p>
          </article>`;
}

function renderDomainHubCard(hub, prefix = "") {
  return `
          <article class="category-card domain-hub-card">
            <h3><a href="${prefix}${domainHubSlug}/${hub.slug}/">${escapeHtml(hub.title)}</a></h3>
            <p class="card-copy">${escapeHtml(hub.summary)}</p>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${hub.entries.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
              <span class="teaching-pill">${hub.paths.length} paths</span>
              <span class="teaching-pill">${hub.promptKits.length} prompts</span>
            </div>
            <p class="muted">${escapeHtml(hub.guidingQuestion)}</p>
            <p class="muted">${escapeHtml(hub.audience)}</p>
          </article>`;
}

function renderComparisonGuideCard(guide, prefix = "") {
  return `
          <article class="category-card comparison-guide-card">
            <h3><a href="${prefix}${comparisonGuideSlug}/${guide.slug}/">${escapeHtml(guide.title)}</a></h3>
            <p class="card-copy">${escapeHtml(guide.summary)}</p>
            <p class="muted"><strong>Quick rule:</strong> ${escapeHtml(guide.quickRule)}</p>
            <div class="path-link-row">
              ${guide.entries
                .map(
                  (entry) =>
                    `<a class="path-link-chip" href="${prefix}${siteConfig.sectionSlug}/${entry.slug}/">${escapeHtml(entry.name)}</a>`,
                )
                .join("")}
            </div>
          </article>`;
}

function renderTeachingKitCard(kit, prefix = "") {
  return `
          <article class="category-card teaching-kit-card">
            <h3><a href="${prefix}${teachingKitSlug}/${kit.slug}/">${escapeHtml(kit.title)}</a></h3>
            <p class="card-copy">${escapeHtml(kit.summary)}</p>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${escapeHtml(kit.duration || "Flexible")}</span>
              <span class="teaching-pill">${kit.entries.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
              ${kit.hub ? `<span class="teaching-pill">${escapeHtml(kit.hub.title)}</span>` : ""}
            </div>
            <p class="muted">${escapeHtml(kit.audience || "")}</p>
          </article>`;
}

function renderSelfCheckCard(check, prefix = "") {
  const estimatedTime = check.estimatedMinutes ? `${check.estimatedMinutes} min` : "";
  return `
          <article class="category-card">
            <h3>${escapeHtml(check.title)}</h3>
            <p class="card-copy">${escapeHtml(check.summary)}</p>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${escapeHtml(check.trackMeta?.name || "Applied")}</span>
              ${check.stageLabel ? `<span class="teaching-pill">${escapeHtml(check.stageLabel)}</span>` : ""}
              ${estimatedTime ? `<span class="teaching-pill">${escapeHtml(estimatedTime)}</span>` : ""}
            </div>
            <p class="muted"><strong>Question:</strong> ${escapeHtml(check.question)}</p>
            <ul class="muted">
              ${check.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
            </ul>
            <div class="path-link-row">
              ${renderEntryLinkChips(check.relatedBiases || [], prefix)}
            </div>
            ${
              (check.pathSlugs || []).length
                ? `<div class="path-link-row">${renderPathLinkChips(check.pathSlugs || [], prefix)}</div>`
                : ""
            }
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

function renderSourceCard(item, prefix = "") {
  const metaLine = [item.kind, item.source, item.year].filter(Boolean).join(" · ");
  return `
          <article class="category-card source-card">
            <h3><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></h3>
            ${metaLine ? `<p class="source-meta">${escapeHtml(metaLine)}</p>` : ""}
            <p class="card-copy">${escapeHtml(item.note || "")}</p>
            ${
              item.relatedEntry
                ? `<div class="path-link-row"><a class="path-link-chip" href="${prefix}${siteConfig.sectionSlug}/${item.relatedEntry.slug}/">${escapeHtml(item.relatedEntry.name)}</a></div>`
                : ""
            }
          </article>`;
}

function renderCurriculumTrackCard(track, itemCount, label, href) {
  return `
          <article class="category-card curriculum-track-card">
            <h3><a href="${href}">${escapeHtml(track.name)}</a></h3>
            <p class="card-copy">${escapeHtml(track.summary)}</p>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${escapeHtml(String(itemCount))} ${escapeHtml(label)}</span>
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
              <a class="button button-secondary" href="${domainHubSlug}/">Browse Contexts</a>
              <a class="button button-secondary" href="${biasMapSlug}/">Open Bias Map</a>
              <a class="button button-secondary" href="${comparisonGuideSlug}/">Compare Biases</a>
              <a class="button button-secondary" href="${teachingKitSlug}/">Use Teaching Kits</a>
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
                <span class="stat-value">${domainHubs.length}</span>
                <span class="stat-label">Domain Hubs</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${comparisonGuides.length}</span>
                <span class="stat-label">Comparison Guides</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${teachingKits.length}</span>
                <span class="stat-label">Teaching Kits</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${selfChecks.length}</span>
                <span class="stat-label">Self-Audits</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${assessmentBank.length}</span>
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

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Domain hubs</h2>
              <p class="section-copy">Start here when the real problem is not the name of the bias but the setting where judgment is getting bent: news, meetings, teaching, relationships, or product design.</p>
            </div>
            <a class="inline-link" href="${domainHubSlug}/">Open all contexts</a>
          </div>
          <div class="category-grid">
            ${domainHubs.map((hub) => renderDomainHubCard(hub)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Compare nearby biases</h2>
              <p class="section-copy">Some labels live close enough together that the distinction matters more than the definition. These guides give readers a fast rule, a diagnostic question set, and a repair move.</p>
            </div>
            <a class="inline-link" href="${comparisonGuideSlug}/">Open all comparisons</a>
          </div>
          <div class="category-grid">
            ${comparisonGuides.slice(0, 4).map((guide) => renderComparisonGuideCard(guide)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Printable teaching kits</h2>
              <p class="section-copy">These are ready-to-run lesson and workshop packets built from the site’s context hubs, comparison guides, self-checks, and assessment modes.</p>
            </div>
            <a class="inline-link" href="${teachingKitSlug}/">Open all kits</a>
          </div>
          <div class="category-grid">
            ${teachingKits.slice(0, 3).map((kit) => renderTeachingKitCard(kit)).join("")}
          </div>
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
              <h2 class="section-title">Curriculum ladder</h2>
              <p class="section-copy">The site now has a clearer progression: start with foundations, move into applied judgment work, then use the teaching-and-team layer when the real challenge is room design or workflow design.</p>
            </div>
            <a class="inline-link" href="${siteConfig.pathSlug}/">See the full progression</a>
          </div>
          <div class="category-grid">
            ${curriculumTracks
              .map((track) =>
                renderCurriculumTrackCard(
                  track,
                  learningPaths.filter((path) => path.track === track.slug).length,
                  "paths",
                  `${siteConfig.pathSlug}/`,
                ),
              )
              .join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Learning paths</h2>
              <p class="section-copy">These curated routes are the closest analogue to LogFall's teaching paths: smaller, more purposeful sequences for a specific job of thinking, now grouped into foundational, applied, and teaching tiers.</p>
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
              <p class="section-copy">Short self-audits for the moments when bias is most likely to slide past you: before a decision, before a forecast, before a people judgment, after a surprising outcome, or while facilitating a room.</p>
            </div>
            <a class="inline-link" href="${siteConfig.checkSlug}/">Open the field guide</a>
          </div>
          <div class="category-grid">
            ${selfChecks.slice(0, 3).map((check) => renderSelfCheckCard(check)).join("")}
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

function renderBiasMapPage() {
  const points = buildBiasMapPoints();
  const categories = tasks
    .map((task) => ({
      name: task.name,
      slug: task.slug,
      color: categoryColors.get(task.name) || "#54728b",
      count: points.filter((point) => point.category === task.name).length,
    }))
    .filter((category) => category.count > 0);

  const data = {
    dimensions: biasMapDimensions,
    defaultX: "spot",
    defaultY: "commit",
    points,
    categories,
  };

  return renderPage({
    title: "Bias Map",
    description: "An interactive scatter plot of cognitive biases by visibility, temptation risk, and category.",
    prefix: "../",
    currentId: "map",
    routePath: `/${biasMapSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Bias Map" },
    ],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Bias Map</p>
          <h2 class="detail-title">Where biases sit across teaching dimensions.</h2>
          <p class="detail-deck">This map plots entries across any two teaching-gauge dimensions. Choose the horizontal and vertical axes, then use color to keep the category layer visible.</p>
        </section>

        <section class="section-block bias-map-shell" data-bias-map-shell>
          <script id="bias-map-data" type="application/json">${safeJsonForScript(data)}</script>
          <div class="section-header">
            <div>
              <h2 class="section-title">Interactive bias map</h2>
              <p class="section-copy">Hover, focus, or click a dot to inspect it. Choose any two dimensions, isolate one category, or find a specific bias.</p>
            </div>
            <span class="teaching-pill" data-bias-map-count>${points.length} plotted biases</span>
          </div>

          <div class="bias-map-controls">
            <label>
              <span>Search</span>
              <input class="search-input" type="search" placeholder="Find a bias..." data-bias-map-search />
            </label>
            <label>
              <span>X axis</span>
              <select class="search-select" data-bias-map-x-axis>
                ${biasMapDimensions
                  .map(
                    (dimension) =>
                      `<option value="${escapeHtml(dimension.slug)}"${dimension.slug === data.defaultX ? " selected" : ""}>${escapeHtml(dimension.label)}</option>`,
                  )
                  .join("")}
              </select>
            </label>
            <label>
              <span>Y axis</span>
              <select class="search-select" data-bias-map-y-axis>
                ${biasMapDimensions
                  .map(
                    (dimension) =>
                      `<option value="${escapeHtml(dimension.slug)}"${dimension.slug === data.defaultY ? " selected" : ""}>${escapeHtml(dimension.label)}</option>`,
                  )
                  .join("")}
              </select>
            </label>
            <label>
              <span>Category</span>
              <select class="search-select" data-bias-map-category>
                <option value="">All categories</option>
                ${categories
                  .map((category) => `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</option>`)
                  .join("")}
              </select>
            </label>
            <button class="button button-secondary button-compact" type="button" data-bias-map-reset>Reset map</button>
          </div>

          <div class="bias-map-layout">
            <div class="bias-map-visual note-panel">
              <svg class="bias-map-plot" data-bias-map-plot role="img" aria-label="Scatter plot of cognitive biases by selected teaching dimensions"></svg>
              <p class="search-empty bias-map-empty hidden" data-bias-map-empty>No plotted biases match those axes and filters.</p>
            </div>
            <aside class="bias-map-side">
              <div class="note-panel bias-map-detail" data-bias-map-detail>
                <h4>Choose a dot</h4>
                <p class="muted">Each point is a bias page. Select one to see its category, selected score pair, gauge notes, and a link into the full entry.</p>
              </div>
              <div class="note-panel bias-map-legend" data-bias-map-legend>
                <h4>Categories</h4>
                ${categories
                  .map(
                    (category) => `
                <button class="bias-map-legend-item" type="button" data-bias-map-legend-category="${escapeHtml(category.slug)}" aria-pressed="false">
                  <span class="bias-map-swatch" style="--map-color:${escapeHtml(category.color)};"></span>
                  <span>${escapeHtml(category.name)}</span>
                  <span class="bias-map-legend-count">${category.count}</span>
                </button>`,
                  )
                  .join("")}
              </div>
            </aside>
          </div>

          <div class="two-column section-block">
            <div class="note-panel">
              <h4>How to read the quadrants</h4>
              <p class="muted">The quadrant labels update with your selected axes, so the upper-left always means low on the horizontal dimension and high on the vertical one.</p>
            </div>
            <div class="note-panel">
              <h4>Why switch axes</h4>
              <p class="muted">The default view highlights visibility and temptation. Switching axes helps surface teaching difficulty, live frequency, and which categories cluster together under different practical questions.</p>
            </div>
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
    bodyClass: "page-bias-index",
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
            <p class="muted">Start with the foundational track if the site is new to you, move into applied paths when the labels are familiar, and use the teaching track when the real work is room design or workflow design.</p>
          </aside>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Curriculum progression</h2>
              <p class="section-copy">The same catalog can be used three different ways: to learn the basic map, to practice on live judgment problems, and to teach or redesign group process.</p>
            </div>
          </div>
          <div class="category-grid">
            ${curriculumTracks
              .map((track) =>
                renderCurriculumTrackCard(
                  track,
                  learningPaths.filter((path) => path.track === track.slug).length,
                  "paths",
                  "./",
                ),
              )
              .join("")}
          </div>
        </section>

        ${curriculumTracks
          .map((track) => {
            const trackPaths = learningPaths.filter((path) => path.track === track.slug);
            if (!trackPaths.length) return "";
            return `
        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">${escapeHtml(track.name)}</h2>
              <p class="section-copy">${escapeHtml(track.summary)}</p>
            </div>
          </div>
          <div class="category-grid">
            ${trackPaths.map((path) => renderPathCard(path, "../")).join("")}
          </div>
        </section>`;
          })
          .join("")}`,
  });
}

function domainCaseStudiesFor(hub, limit = 6) {
  const hubSlugs = new Set(hub.biasSlugs || []);
  return caseStudyLibrary
    .filter((item) => item.entries.some((entry) => hubSlugs.has(entry.slug)))
    .slice(0, limit);
}

function domainSourceTrailFor(hub, limit = 6) {
  const curated = [];
  const seen = new Set();

  for (const entry of hub.entries || []) {
    for (const source of sourceTrailFor(entry, { includeSeed: false })) {
      const key = `${String(source.href || "").trim().toLowerCase()}::${String(source.title || "").trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      curated.push({
        ...source,
        relatedEntry: entry,
      });
    }
  }

  return curated.slice(0, limit);
}

function renderDomainHubsIndexPage() {
  return renderPage({
    title: "Contexts",
    description: "Applied CogBias hubs for news reading, teams and meetings, teaching, relationships, and product or UX work.",
    prefix: "../",
    currentId: "contexts",
    routePath: `/${domainHubSlug}/`,
    breadcrumbs: [{ label: "Home", href: "../" }, { label: "Contexts" }],
    body: `
        <section class="detail-section">
          <p class="eyebrow">Applied Contexts</p>
          <h2 class="detail-title">Start with the situation, then choose the bias tools.</h2>
          <p class="detail-deck">These hubs are not new bias entries. They are practical workbenches that combine existing bias pages, paths, self-checks, prompts, and case studies around recurring domains of judgment.</p>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Domain-specific hubs</h2>
              <p class="section-copy">Use these when you know the setting before you know the label.</p>
            </div>
          </div>
          <div class="category-grid">
            ${domainHubs.map((hub) => renderDomainHubCard(hub, "../")).join("")}
          </div>
        </section>`,
  });
}

function renderDomainHubDetailPage(hub) {
  const prefix = "../../";
  const hubCaseStudies = domainCaseStudiesFor(hub);

  return renderPage({
    title: hub.title,
    description: hub.summary,
    prefix,
    currentId: "contexts",
    routePath: `/${domainHubSlug}/${hub.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "Contexts", href: "../" },
      { label: hub.title },
    ],
    body: `
        <section class="detail-section domain-hub-hero">
          <p class="eyebrow">Applied Context</p>
          <h2 class="detail-title">${escapeHtml(hub.title)}</h2>
          <p class="detail-deck">${escapeHtml(hub.summary)}</p>
          <div class="hero-actions">
            <a class="button button-primary" href="../../${siteConfig.assessmentSlug}/?context=${encodeURIComponent(hub.slug)}">Practice this context</a>
            <a class="button button-secondary" href="../">Browse all contexts</a>
          </div>
          <div class="two-column section-block">
            <div class="note-panel">
              <h4>Use this when</h4>
              <p class="muted">${escapeHtml(hub.scenario)}</p>
            </div>
            <div class="note-panel">
              <h4>Guiding question</h4>
              <p class="muted">${escapeHtml(hub.guidingQuestion)}</p>
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Bias cluster</h2>
              <p class="section-copy">These are the entries most likely to matter in this domain. Use the cluster to compare nearby pulls before choosing a label.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${hub.entries.map((entry) => renderBiasCard(entry, prefix)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Workflow</h2>
              <p class="section-copy">The hub is meant to change the process, not just supply labels.</p>
            </div>
          </div>
          <div class="category-grid">
            ${(hub.workflow || [])
              .map(
                (step) => `
            <article class="category-card domain-workflow-card">
              <h3>${escapeHtml(step.label)}</h3>
              <p class="card-copy">${escapeHtml(step.text)}</p>
            </article>`,
              )
              .join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="two-column">
            <div class="note-panel">
              <h4>Watch for</h4>
              <ul class="muted">
                ${(hub.watchFor || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </div>
            <div class="note-panel">
              <h4>Starter protocol</h4>
              <ol class="muted">
                ${(hub.starterProtocol || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ol>
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Use the existing curriculum</h2>
              <p class="section-copy">These are the closest learning paths and short self-checks for this context.</p>
            </div>
          </div>
          <div class="category-grid">
            ${hub.paths.map((path) => renderPathCard(path, prefix)).join("")}
            ${hub.selfChecks.map((check) => renderSelfCheckCard(check, prefix)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Prompt kits for this domain</h2>
              <p class="section-copy">Use these after you have written the concrete case clearly enough for a model to help widen the frame.</p>
            </div>
          </div>
          <div class="category-grid prompt-grid">
            ${hub.promptKits.map((promptKit) => renderPromptCard(promptKit, prefix)).join("")}
          </div>
        </section>

        ${
          hubCaseStudies.length
            ? `<section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Case studies in the neighborhood</h2>
              <p class="section-copy">These cases are pulled from the linked bias pages so the hub stays connected to concrete examples.</p>
            </div>
            <a class="inline-link" href="../../${caseStudySlug}/">Open case study library</a>
          </div>
          <div class="category-grid">
            ${hubCaseStudies.map((item) => renderCaseStudyCard(item, prefix)).join("")}
          </div>
        </section>`
            : ""
        }

        `,
  });
}

function renderComparisonGuidesPage() {
  return renderPage({
    title: "Compare Biases",
    description: "Distinction guides for cognitive biases that are easy to confuse in live judgment work.",
    prefix: "../",
    currentId: "compare",
    routePath: `/${comparisonGuideSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Compare Biases" },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Comparison Guides</p>
            <h2 class="detail-title">When two labels both seem plausible, slow the distinction down.</h2>
            <p class="detail-deck">Bias work gets sharper when readers can tell nearby patterns apart. These guides focus on high-confusion pairs, with quick rules, diagnostic questions, examples, and a repair move that works before the label hardens.</p>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">How To Use Them</p>
            <p class="muted">Start with the quick rule, then use the diagnostic questions before reading the answer into the case. The goal is not taxonomic purity; it is better process selection.</p>
          </aside>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">High-confusion pairs</h2>
              <p class="section-copy">Each guide links back to the underlying bias entries so comparison and deeper study stay connected.</p>
            </div>
          </div>
          <div class="category-grid">
            ${comparisonGuides.map((guide) => renderComparisonGuideCard(guide, "../")).join("")}
          </div>
        </section>`,
  });
}

function renderComparisonGuideDetailPage(guide) {
  const prefix = "../../";
  const [leftEntry, rightEntry] = guide.entries;
  const leftLabel = guide.left?.label || leftEntry?.name || "First bias";
  const rightLabel = guide.right?.label || rightEntry?.name || "Second bias";

  return renderPage({
    title: guide.title,
    description: guide.summary,
    prefix,
    currentId: "compare",
    routePath: `/${comparisonGuideSlug}/${guide.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "Compare Biases", href: "../" },
      { label: guide.title },
    ],
    body: `
        <section class="detail-section comparison-guide-hero">
          <p class="eyebrow">Compare Biases</p>
          <h2 class="detail-title">${escapeHtml(guide.title)}</h2>
          <p class="detail-deck">${escapeHtml(guide.summary)}</p>
          <div class="hero-actions">
            ${guide.entries
              .map(
                (entry) =>
                  `<a class="button button-secondary" href="../../${siteConfig.sectionSlug}/${entry.slug}/">Study ${escapeHtml(entry.name)}</a>`,
              )
              .join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="comparison-split-grid">
            <article class="category-card comparison-side-card">
              <p class="eyebrow">${escapeHtml(leftLabel)}</p>
              <h3>Core pattern</h3>
              <p class="card-copy">${escapeHtml(guide.left?.core || "")}</p>
              <p class="muted"><strong>Ask:</strong> ${escapeHtml(guide.left?.ask || "")}</p>
            </article>
            <article class="category-card comparison-side-card">
              <p class="eyebrow">${escapeHtml(rightLabel)}</p>
              <h3>Core pattern</h3>
              <p class="card-copy">${escapeHtml(guide.right?.core || "")}</p>
              <p class="muted"><strong>Ask:</strong> ${escapeHtml(guide.right?.ask || "")}</p>
            </article>
          </div>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Why people mix them up</h4>
            <p class="muted">${escapeHtml(guide.commonConfusion)}</p>
          </div>
          <div class="note-panel">
            <h4>Quick rule</h4>
            <p class="muted">${escapeHtml(guide.quickRule)}</p>
          </div>
        </div>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Diagnostic questions</h2>
              <p class="section-copy">Use these before deciding which label should carry the lesson.</p>
            </div>
          </div>
          <div class="category-grid">
            ${(guide.diagnosticQuestions || [])
              .map(
                (question) => `
                  <article class="category-card">
                    <p class="card-copy">${escapeHtml(question)}</p>
                  </article>`,
              )
              .join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Mini cases</h2>
              <p class="section-copy">The same surface area can point to different underlying mechanisms.</p>
            </div>
          </div>
          <div class="category-grid">
            ${(guide.examples || [])
              .map(
                (example) => `
                  <article class="category-card comparison-example-card">
                    <h3>${escapeHtml(example.betterLabel)}</h3>
                    <p class="card-copy">${escapeHtml(example.situation)}</p>
                    <p class="muted"><strong>Why:</strong> ${escapeHtml(example.why)}</p>
                  </article>`,
              )
              .join("")}
          </div>
        </section>

        <section class="detail-section section-block">
          <p class="eyebrow">Repair Move</p>
          <h2 class="section-title">Change the process, then choose the label.</h2>
          <p class="section-copy">${escapeHtml(guide.repairMove)}</p>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Study the entries</h2>
              <p class="section-copy">Use the comparison as a bridge into the fuller pages.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${guide.entries.map((entry) => renderBiasCard(entry, prefix)).join("")}
          </div>
        </section>`,
  });
}

function renderTeachingKitsPage() {
  return renderPage({
    title: "Teaching Kits",
    description: "Printable CogBias lesson and workshop kits built from context hubs, comparison guides, and assessments.",
    prefix: "../",
    currentId: "kits",
    routePath: `/${teachingKitSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Teaching Kits" },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Teaching Kits</p>
            <h2 class="detail-title">Printable lesson packets for turning the catalog into a live activity.</h2>
            <p class="detail-deck">Each kit combines a context hub, core bias pages, comparison guides, self-checks, and a matching assessment mode. They are designed to print cleanly now and absorb images later without changing the teaching sequence.</p>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">Print Friendly</p>
            <p class="muted">Open a kit, use the print button, and the page will hide navigation chrome while preserving prompts, agenda, notes, and linked study targets.</p>
          </aside>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Ready-to-run kits</h2>
              <p class="section-copy">Use these as classroom activities, team workshops, coaching sessions, or self-guided study packets.</p>
            </div>
          </div>
          <div class="category-grid">
            ${teachingKits.map((kit) => renderTeachingKitCard(kit, "../")).join("")}
          </div>
        </section>`,
  });
}

function renderTeachingKitDetailPage(kit) {
  const prefix = "../../";
  return renderPage({
    title: kit.title,
    description: kit.summary,
    prefix,
    currentId: "kits",
    routePath: `/${teachingKitSlug}/${kit.slug}/`,
    breadcrumbs: [
      { label: "Home", href: "../../" },
      { label: "Teaching Kits", href: "../" },
      { label: kit.title },
    ],
    body: `
        <section class="detail-section teaching-kit-hero">
          <p class="eyebrow">Teaching Kit</p>
          <h2 class="detail-title">${escapeHtml(kit.title)}</h2>
          <p class="detail-deck">${escapeHtml(kit.summary)}</p>
          <div class="teaching-pill-row">
            <span class="teaching-pill">${escapeHtml(kit.duration || "Flexible")}</span>
            ${kit.hub ? `<span class="teaching-pill">${escapeHtml(kit.hub.title)}</span>` : ""}
            <span class="teaching-pill">${kit.entries.length} ${escapeHtml(siteConfig.entryLabelPlural)}</span>
          </div>
          <div class="hero-actions">
            <button class="button button-primary" type="button" data-print-page>Print this kit</button>
            ${kit.assessmentContext ? `<a class="button button-secondary" href="../../${siteConfig.assessmentSlug}/?context=${encodeURIComponent(kit.assessmentContext)}">Run assessment mode</a>` : ""}
          </div>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>Audience</h4>
            <p class="muted">${escapeHtml(kit.audience || "")}</p>
          </div>
          <div class="note-panel">
            <h4>Objectives</h4>
            <ul class="muted">
              ${(kit.objectives || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </div>

        <section class="section-block print-keep-together">
          <div class="section-header">
            <div>
              <h2 class="section-title">Materials</h2>
              <p class="section-copy">Prep these before using the kit live.</p>
            </div>
          </div>
          <div class="category-grid">
            ${(kit.materials || [])
              .map(
                (item) => `
                  <article class="category-card teaching-kit-mini-card">
                    <p class="card-copy">${escapeHtml(item)}</p>
                  </article>`,
              )
              .join("")}
          </div>
        </section>

        <section class="section-block print-keep-together">
          <div class="section-header">
            <div>
              <h2 class="section-title">Agenda</h2>
              <p class="section-copy">A suggested run of show. Adjust timing to fit the group.</p>
            </div>
          </div>
          <div class="case-list teaching-agenda-list">
            ${(kit.agenda || [])
              .map(
                (step) => `
                  <article class="case-item">
                    <p class="case-title">${escapeHtml(step.time)}</p>
                    <p class="case-summary">${escapeHtml(step.activity)}</p>
                  </article>`,
              )
              .join("")}
          </div>
        </section>

        <div class="two-column section-block print-keep-together">
          <div class="note-panel">
            <h4>Worksheet prompts</h4>
            <ol class="muted">
              ${(kit.worksheetPrompts || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ol>
          </div>
          <div class="note-panel">
            <h4>Facilitator notes</h4>
            <ul class="muted">
              ${(kit.facilitatorNotes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </div>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Linked study tools</h2>
              <p class="section-copy">These are the supporting pieces to open before or after the live activity.</p>
            </div>
          </div>
          <div class="category-grid">
            ${kit.hub ? renderDomainHubCard(kit.hub, prefix) : ""}
            ${kit.paths.map((path) => renderPathCard(path, prefix)).join("")}
            ${kit.selfChecks.map((check) => renderSelfCheckCard(check, prefix)).join("")}
            ${kit.comparisons.map((guide) => renderComparisonGuideCard(guide, prefix)).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Bias pages in this kit</h2>
              <p class="section-copy">Use these entries as the reference layer after the activity surfaces the problem.</p>
            </div>
          </div>
          <div class="entry-grid">
            ${kit.entries.map((entry) => renderBiasCard(entry, prefix)).join("")}
          </div>
        </section>`,
  });
}

function coverageRecordsForEntries() {
  return entries
    .map((entry) => {
      const caseCount = caseStudiesFor(entry).length;
      const assessmentCount = assessmentBank.filter((item) => item.correctBias === entry.slug).length;
      const pathCount = pathObjectsForEntry(entry).length;
      const checkCount = selfChecksForEntry(entry).length;
      const promptCount = promptKitsForEntry(entry).length;
      const contextCount = domainHubs.filter((hub) => (hub.biasSlugs || []).includes(entry.slug)).length;
      const comparisonCount = comparisonGuidesForEntry(entry, Number.POSITIVE_INFINITY).length;
      const kitCount = teachingKitsForEntry(entry, Number.POSITIVE_INFINITY).length;
      const editorialSignals = [
        entry.analogyClaim,
        entry.teachingGauges?.length,
        entry.caseStudies?.length,
        entry.practiceLab,
        entry.useLabelWhen,
      ].filter(Boolean).length;
      const score = Math.min(
        100,
        caseCount * 7 +
          assessmentCount * 4 +
          pathCount * 5 +
          checkCount * 5 +
          promptCount * 4 +
          contextCount * 4 +
          comparisonCount * 6 +
          kitCount * 5 +
          editorialSignals * 5,
      );
      const status =
        score >= 70 ? "Flagship-ready" : score >= 40 ? "Strong scaffold" : score >= 20 ? "Needs enrichment" : "Catalog-only";
      return {
        entry,
        caseCount,
        assessmentCount,
        pathCount,
        checkCount,
        promptCount,
        contextCount,
        comparisonCount,
        kitCount,
        editorialSignals,
        score,
        status,
      };
    })
    .sort((left, right) => left.score - right.score || left.entry.name.localeCompare(right.entry.name));
}

function renderCoverageRecordCard(record, prefix = "") {
  return `
          <article class="category-card coverage-card">
            <h3><a href="${prefix}${siteConfig.sectionSlug}/${record.entry.slug}/">${escapeHtml(record.entry.name)}</a></h3>
            <p class="card-copy">${escapeHtml(record.entry.cardSummary || record.entry.summary)}</p>
            <div class="coverage-meter" style="--coverage:${record.score};">
              <span></span>
            </div>
            <div class="teaching-pill-row">
              <span class="teaching-pill">${escapeHtml(record.status)}</span>
              <span class="teaching-pill">${record.score}/100</span>
              <span class="teaching-pill">${record.caseCount} cases</span>
              <span class="teaching-pill">${record.assessmentCount} assessments</span>
              <span class="teaching-pill">${record.comparisonCount} comparisons</span>
            </div>
          </article>`;
}

function renderCoveragePage() {
  const records = coverageRecordsForEntries();
  const flagshipRecords = records.filter((record) => record.score >= 70);
  const needsWork = records.filter((record) => record.score < 40).slice(0, 18);
  const featuredGaps = records
    .filter((record) => (siteConfig.featured || []).includes(record.entry.slug) && record.score < 70)
    .sort((left, right) => left.score - right.score || left.entry.name.localeCompare(right.entry.name))
    .slice(0, 12);

  return renderPage({
    title: "Coverage Map",
    description: "Editorial coverage dashboard for cases, assessments, context hubs, kits, and comparison guides.",
    prefix: "../",
    currentId: "about",
    routePath: `/${coverageSlug}/`,
    breadcrumbs: [
      { label: "Home", href: "../" },
      { label: "Coverage Map" },
    ],
    body: `
        <section class="detail-hero">
          <div class="detail-section">
            <p class="eyebrow">Coverage Map</p>
            <h2 class="detail-title">A living audit of how much editorial support each bias has.</h2>
            <p class="detail-deck">The catalog is intentionally wide. This page makes the depth unevenness visible so future passes can target cases, assessments, comparisons, and teaching kits where they will matter most.</p>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">Current Depth</p>
            <div class="stat-grid">
              <div class="stat-card">
                <span class="stat-value">${flagshipRecords.length}</span>
                <span class="stat-label">Flagship-ready</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${needsWork.length}</span>
                <span class="stat-label">Priority Gaps Shown</span>
              </div>
            </div>
          </aside>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Featured entries needing the next pass</h2>
              <p class="section-copy">These are important public-facing pages that still have room for more cases, assessments, comparison support, or guided scaffolding.</p>
            </div>
          </div>
          <div class="category-grid">
            ${featuredGaps.map((record) => renderCoverageRecordCard(record, "../")).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Lowest-coverage entries</h2>
              <p class="section-copy">These are the most useful targets when broad catalog depth becomes the next editorial priority.</p>
            </div>
          </div>
          <div class="category-grid">
            ${needsWork.map((record) => renderCoverageRecordCard(record, "../")).join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">How the score works</h2>
              <p class="section-copy">This is an editorial planning heuristic, not a truth score. It rewards case studies, assessment items, path/check/prompt links, context hubs, comparison guides, kits, and hand-authored page modules.</p>
            </div>
          </div>
          <div class="two-column">
            <div class="note-panel">
              <h4>Use it for</h4>
              <p class="muted">Choosing the next enrichment pass, balancing flagship pages against long-tail coverage, and spotting pages that need concrete cases before they can teach well.</p>
            </div>
            <div class="note-panel">
              <h4>Do not use it for</h4>
              <p class="muted">Deciding whether a bias is important, valid, or settled. It only measures how richly this site currently supports the entry.</p>
            </div>
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
              <span class="pill">${escapeHtml(path.trackMeta?.name || "Applied")}</span>
              ${path.estimatedMinutes ? `<span class="pill">${escapeHtml(`${path.estimatedMinutes} min`)}</span>` : ""}
            </div>
          </div>
          <aside class="hero-panel hero-side">
            <p class="eyebrow">Use It When</p>
            <p class="muted">${escapeHtml(path.whenToUse)}</p>
            <p class="eyebrow" style="margin-top:14px;">Track</p>
            <p class="muted">${escapeHtml(path.trackMeta?.summary || "A focused route through the catalog.")}</p>
            <p class="eyebrow" style="margin-top:14px;">Guiding Question</p>
            <p class="muted">${escapeHtml(path.guidingQuestion)}</p>
          </aside>
        </section>

        <div class="two-column section-block">
          <div class="note-panel">
            <h4>By the end of this path</h4>
            <ul class="muted">
              ${(path.outcomes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
          <div class="note-panel">
            <h4>How to study it</h4>
            <p class="muted">Work the pages in order, then loop back and compare which distortions happened earliest, which ones protected the first impression, and which ones interfered with later learning.</p>
            ${
              (path.recommendedCheckSlugs || []).length
                ? `<div class="path-link-row">${(path.recommendedCheckSlugs || [])
                    .map((slug) => selfCheckBySlug.get(slug))
                    .filter(Boolean)
                    .map(
                      (check) =>
                        `<a class="path-link-chip" href="../../${siteConfig.checkSlug}/#${check.slug}">${escapeHtml(check.title)}</a>`,
                    )
                    .join("")}</div>`
                : ""
            }
            ${
              (path.nextPathSlugs || []).length
                ? `<p class="muted"><strong>Next:</strong></p><div class="path-link-row">${renderPathLinkChips(path.nextPathSlugs || [], "../../")}</div>`
                : ""
            }
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
          <p class="detail-deck">These are not quizzes. They are small procedural checkpoints you can run before a choice, before a forecast, before a people judgment, after a result when memory is already trying to smooth the story, or while you are facilitating a room that is converging too quickly.</p>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Use the checks as a progression</h2>
              <p class="section-copy">The field guide now mirrors the path ladder: learn the basic moves first, practice them in live decisions, and then use the facilitation checks when the social structure itself needs repair.</p>
            </div>
          </div>
          <div class="category-grid">
            ${curriculumTracks
              .map((track) =>
                renderCurriculumTrackCard(
                  track,
                  selfChecks.filter((check) => check.track === track.slug).length,
                  "checks",
                  "./",
                ),
              )
              .join("")}
          </div>
        </section>

        ${curriculumTracks
          .map((track) => {
            const trackChecks = selfChecks.filter((check) => check.track === track.slug);
            if (!trackChecks.length) return "";
            return `
        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">${escapeHtml(track.name)}</h2>
              <p class="section-copy">${escapeHtml(track.summary)}</p>
            </div>
          </div>
          <div class="category-grid">
            ${trackChecks.map((check) => `<div id="${check.slug}">${renderSelfCheckCard(check, "../")}</div>`).join("")}
          </div>
        </section>`;
          })
          .join("")}`,
  });
}

function renderAssessmentPage() {
  const payload = assessmentBank.map((item) => ({
    ...item,
    difficultyLabel: item.difficultyMeta?.name || "Applied",
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
          <p class="detail-deck">Each run draws from a bank of short bias scenarios. For every item, choose the bias that most likely explains the drift and then choose the best next move for improving the process. You can now run the bank by difficulty, bias category, and applied context instead of taking one undifferentiated quiz.</p>
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

        <div class="note-panel hidden assessment-history-panel" data-assessment-history></div>

        <section class="section-block">
          <div class="category-grid">
            ${assessmentDifficulties
              .map(
                (difficulty) => `
                  <article class="category-card">
                    <h3>${escapeHtml(difficulty.name)}</h3>
                    <p class="card-copy">${escapeHtml(difficulty.summary)}</p>
                    <div class="teaching-pill-row">
                      <span class="teaching-pill">${assessmentBank.filter((item) => item.difficulty === difficulty.slug).length} scenarios</span>
                    </div>
                  </article>`,
              )
              .join("")}
          </div>
        </section>

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Practice by context</h2>
              <p class="section-copy">These modes pull scenarios from the domain hubs, so a teacher, facilitator, product team, or media-literacy group can practice with examples closer to their actual work.</p>
            </div>
          </div>
          <div class="category-grid">
            ${domainHubs
              .map(
                (hub) => `
                  <article class="category-card assessment-context-card">
                    <h3><a href="../${domainHubSlug}/${hub.slug}/">${escapeHtml(hub.title)}</a></h3>
                    <p class="card-copy">${escapeHtml(hub.guidingQuestion)}</p>
                    <div class="teaching-pill-row">
                      <span class="teaching-pill">${assessmentBank.filter((item) => (item.contexts || []).some((context) => context.slug === hub.slug)).length} scenarios</span>
                    </div>
                    <p><a class="path-link-chip" href="./?context=${encodeURIComponent(hub.slug)}">Run this mode</a></p>
                  </article>`,
              )
              .join("")}
          </div>
        </section>

        <section class="panel search-panel assessment-runner-panel" data-bias-assessment-shell data-assessment-size="10">
          <div class="section-header">
            <div>
              <h3 class="section-title">Take the mixed scenario assessment</h3>
              <p class="section-copy">Each set uses real decision, forecasting, conflict, and meeting situations rather than bare definitions.</p>
            </div>
          </div>
          <div class="assessment-filter-row">
            <label class="assessment-filter">
              <span>Difficulty</span>
              <select class="search-select" data-assessment-difficulty>
                <option value="">Mixed levels</option>
                ${assessmentDifficulties
                  .map((difficulty) => `<option value="${escapeHtml(difficulty.slug)}">${escapeHtml(difficulty.name)}</option>`)
                  .join("")}
              </select>
            </label>
            <label class="assessment-filter">
              <span>Category</span>
              <select class="search-select" data-assessment-category>
                <option value="">All categories</option>
                ${tasks.map((task) => `<option value="${escapeHtml(task.name)}">${escapeHtml(task.name)}</option>`).join("")}
              </select>
            </label>
            <label class="assessment-filter">
              <span>Context</span>
              <select class="search-select" data-assessment-context>
                <option value="">All contexts</option>
                ${domainHubs.map((hub) => `<option value="${escapeHtml(hub.slug)}">${escapeHtml(hub.title)}</option>`).join("")}
              </select>
            </label>
          </div>
          <p class="muted assessment-current-run" data-assessment-summary></p>
          <div class="assessment-toolbar">
            <button class="button button-primary button-compact" type="button" data-bias-assessment-new>Load another set</button>
            <a class="button button-secondary button-compact" href="../${siteConfig.sectionSlug}/">Study the full reference</a>
          </div>
          <div class="assessment-items" data-bias-assessment-items></div>
          <div class="note-panel hidden assessment-empty-state" data-assessment-empty>
            <h4>No scenarios matched this filter</h4>
            <p class="muted">Try a broader difficulty level, switch back to all categories, or clear the context mode.</p>
          </div>
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
  const entryComparisonGuides = comparisonGuidesForEntry(entry);
  const entryTeachingKits = teachingKitsForEntry(entry);

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
            ${renderDetailIllustration(entry)}
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
              <h2 class="section-title">What's happening here.</h2>
              <p class="section-copy">This comparison makes the hidden pull easier to see before the technical label has to do all the work.</p>
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

        ${
          entryComparisonGuides.length
            ? `
        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Compare this label</h2>
              <p class="section-copy">These distinction guides slow down the most common nearby-label confusions before the diagnosis hardens.</p>
            </div>
            <a class="inline-link" href="../../${comparisonGuideSlug}/">Open comparison guides</a>
          </div>
          <div class="category-grid">
            ${entryComparisonGuides.map((guide) => renderComparisonGuideCard(guide, "../../")).join("")}
          </div>
        </section>`
            : ""
        }

        <section class="section-block">
          <div class="section-header">
            <div>
              <h2 class="section-title">Similar biases and easy confusions</h2>
              <p class="section-copy">These are nearby labels that can share the same outer appearance while differing in what actually drives the distortion. Use the overlap, the distinction, and the diagnostic question together before settling the call.</p>
            </div>
          </div>
          <div class="category-grid">
            ${confusions
              .map(
                (item) => `
                  <article class="category-card">
                    <h3><a href="../../${siteConfig.sectionSlug}/${item.entry.slug}/">${escapeHtml(item.entry.name)}</a></h3>
                    ${
                      item.looksSimilarBecause
                        ? `<p class="card-copy"><strong>Why it looks similar:</strong> ${escapeHtml(item.looksSimilarBecause)}</p>`
                        : ""
                    }
                    <p class="card-copy"><strong>${item.looksSimilarBecause ? "Key distinction:" : "Why compare it:"}</strong> ${escapeHtml(item.note)}</p>
                    ${
                      item.diagnosticQuestion
                        ? `<p class="muted"><strong>Ask:</strong> ${escapeHtml(item.diagnosticQuestion)}</p>`
                        : ""
                    }
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
            ${
              entryTeachingKits.length
                ? `<article class="category-card">
              <h3>Teaching kits</h3>
              <p class="card-copy">Printable lessons and workshop packets where this bias appears in context.</p>
              <div class="path-link-row">
                ${entryTeachingKits
                  .map(
                    (kit) =>
                      `<a class="path-link-chip" href="../../${teachingKitSlug}/${kit.slug}/">${escapeHtml(kit.title)}</a>`,
                  )
                  .join("")}
              </div>
            </article>`
                : ""
            }
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
              <li><code>data/entry_teaching_modules*.json</code>, <code>data/assessment_bank*.json</code>, <code>data/assessment_metadata*.json</code>, and <code>data/comparison_guides*.json</code> for flagship-page pedagogy, scenario practice, and nearby-label distinctions.</li>
              <li><code>data/learning_paths*.json</code>, <code>data/path_curriculum*.json</code>, <code>data/self_checks*.json</code>, <code>data/self_check_curriculum*.json</code>, <code>data/teaching_kits*.json</code>, <code>data/prompt_kits*.json</code>, and <code>data/theory_articles*.json</code> for the guided layers.</li>
              <li><code>scripts/import_wikipedia_biases.py</code> for refreshing the seed catalog.</li>
            </ul>
            <p><a class="text-link" href="../${coverageSlug}/">Open the editorial coverage map</a></p>
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
  await fs.cp(path.join(siteDir, assetsDirName), path.join(projectRoot, assetsDirName), {
    recursive: true,
    force: true,
  });
  await fs.cp(path.join(siteDir, brandDirName), path.join(projectRoot, brandDirName), {
    recursive: true,
    force: true,
  });
}

async function writeTextFile(relPath, contents) {
  const outputPath = path.join(projectRoot, relPath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const normalizedContents = relPath.endsWith(".html") ? contents.replace(/[ \t]+$/gm, "") : contents;
  await fs.writeFile(outputPath, normalizedContents, "utf8");
}

async function cleanOwnedOutput() {
  const ownedPaths = [
    "index.html",
    "404.html",
    "styles.css",
    "app.js",
    assetsDirName,
    brandDirName,
    "about",
    "biases",
    "categories",
    "countermoves",
    domainHubSlug,
    comparisonGuideSlug,
    teachingKitSlug,
    coverageSlug,
    biasMapSlug,
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
  await writeTextFile(`${domainHubSlug}/index.html`, renderDomainHubsIndexPage());
  await writeTextFile(`${comparisonGuideSlug}/index.html`, renderComparisonGuidesPage());
  await writeTextFile(`${teachingKitSlug}/index.html`, renderTeachingKitsPage());
  await writeTextFile(`${coverageSlug}/index.html`, renderCoveragePage());
  await writeTextFile(`${biasMapSlug}/index.html`, renderBiasMapPage());
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

  for (const hub of domainHubs) {
    await writeTextFile(`${domainHubSlug}/${hub.slug}/index.html`, renderDomainHubDetailPage(hub));
  }

  for (const guide of comparisonGuides) {
    await writeTextFile(`${comparisonGuideSlug}/${guide.slug}/index.html`, renderComparisonGuideDetailPage(guide));
  }

  for (const kit of teachingKits) {
    await writeTextFile(`${teachingKitSlug}/${kit.slug}/index.html`, renderTeachingKitDetailPage(kit));
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
        icons: [
          {
            src: `/${androidChrome192Path}`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `/${androidChrome512Path}`,
            sizes: "512x512",
            type: "image/png",
          },
        ],
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
      `/${domainHubSlug}/`,
      `/${comparisonGuideSlug}/`,
      `/${teachingKitSlug}/`,
      `/${coverageSlug}/`,
      `/${biasMapSlug}/`,
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
      ...domainHubs.map((hub) => `/${domainHubSlug}/${hub.slug}/`),
      ...comparisonGuides.map((guide) => `/${comparisonGuideSlug}/${guide.slug}/`),
      ...teachingKits.map((kit) => `/${teachingKitSlug}/${kit.slug}/`),
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
