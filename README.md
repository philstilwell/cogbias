# CogBias

Static GitHub Pages site generator for a cognitive-biases sister site to LogFall.

## Current Model

- LogFall-like visual and navigational feel, rebuilt around cognitive biases instead of fallacies.
- Broad catalog seeded from Wikipedia's `List of cognitive biases`.
- Two organizing layers:
  - `categories/` for broad judgment tasks such as estimation, recall, and causal attribution.
  - `patterns/` for cross-cutting distortion shapes such as association, inertia, and outcome.
- New guided layers modeled on the strongest parts of LogFall:
  - `paths/` for curated learning routes, now grouped into foundational, applied, and teaching/team tracks.
  - `check-yourself/` for self-audit checklists aligned to the same progression.
  - `assessment/` for mixed scenario runs with difficulty tiers and category filters.
  - `prompts/` for bias-aware AI prompt kits.
  - `theory/` for short framing essays with linked empirical anchors from the flagship bias pages.
- Flagship bias pages now carry explicit source trails in addition to case studies, practice labs, and companion theory links.
- Illustration placeholders already reserved on bias detail pages for future image production.

## Source Of Truth

- Site metadata, taxonomy copy, featured entries, and countermoves:
  - `data/site.json`
- Generated bias catalog:
  - `data/biases.json`
- Richer hand-authored editorial sections for selected core entries:
  - `data/editorial_enrichments*.json`
- Flagship-page teaching modules and source trails:
  - `data/entry_teaching_modules*.json`
  - `data/entry_sources*.json`
- Curated learning paths:
  - `data/learning_paths*.json`
  - `data/path_curriculum*.json`
- Self-audit checklists:
  - `data/self_checks*.json`
  - `data/self_check_curriculum*.json`
- Assessment scenarios and tier metadata:
  - `data/assessment_bank*.json`
  - `data/assessment_metadata*.json`
- Bias-aware prompt kits:
  - `data/prompt_kits*.json`
- Theory articles:
  - `data/theory_articles*.json`
- Wikipedia import script:
  - `scripts/import_wikipedia_biases.py`
- Static site builder:
  - `scripts/build.mjs`
- Shared front-end assets:
  - `site/styles.css`
  - `site/app.js`

## Build

1. Refresh the imported catalog when needed:
   - `python3 scripts/import_wikipedia_biases.py`
2. Rebuild the site:
   - `node scripts/build.mjs`

The published GitHub Pages output lives at the repo root.

## Editorial Strategy

- Use the imported catalog for wide coverage.
- Use `data/editorial_enrichments*.json` to deepen important entries without losing the broad index.
- Use `data/entry_sources*.json` to keep flagship pages traceable to the literature while preserving the site's clarity-first tone.
- Use path and self-check curriculum metadata to turn the catalog into a progression rather than a flat library.
- Use learning paths, self-checks, prompt kits, theory notes, and assessment tiers to make the site feel like a real guided resource rather than a flat reference.
- Keep the image placeholder layout intact until the illustration set is ready.

## Next Likely Steps

1. Add curated source trails to more non-flagship entries beyond the current top tier.
2. Expand the long-tail editorial layer with more hand-authored `editorial_enrichments` tiers.
3. Add custom image assets into the reserved illustration slots when the image set is ready.
4. Set `siteUrl` in `data/site.json` before shipping sitemap and canonical URLs.
