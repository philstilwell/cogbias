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
  - `assessment/` for mixed scenario runs with difficulty tiers, category filters, and applied context modes.
  - `compare/` for high-confusion distinction guides between nearby bias labels.
  - `teaching-kits/` for printable lessons and workshops assembled from the guided layers.
  - `prompts/` for bias-aware AI prompt kits.
  - `theory/` for short framing essays that connect the bias pages to larger teaching and debiasing themes.
- `coverage/` for an editorial dashboard that shows which entries need more cases, assessments, or guided support.
- Illustration placeholders already reserved on bias detail pages for future image production.

## Source Of Truth

- Site metadata, taxonomy copy, featured entries, and countermoves:
  - `data/site.json`
- Generated bias catalog:
  - `data/biases.json`
- Richer hand-authored editorial sections for selected core entries:
  - `data/editorial_enrichments*.json`
- Flagship-page teaching modules:
  - `data/entry_teaching_modules*.json`
- Curated learning paths:
  - `data/learning_paths*.json`
  - `data/path_curriculum*.json`
- Self-audit checklists:
  - `data/self_checks*.json`
  - `data/self_check_curriculum*.json`
- Assessment scenarios and tier metadata:
  - `data/assessment_bank*.json`
  - `data/assessment_metadata*.json`
- Comparison guides and teaching kits:
  - `data/comparison_guides*.json`
  - `data/teaching_kits*.json`
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
- Use path and self-check curriculum metadata to turn the catalog into a progression rather than a flat library.
- Use learning paths, self-checks, comparison guides, teaching kits, prompt kits, theory notes, and assessment tiers to make the site feel like a real guided resource rather than a flat reference.
- Keep the image placeholder layout intact until the illustration set is ready.

## Next Likely Steps

1. Use `coverage/` to choose the next tranche of case studies and guided enrichments.
2. Expand the long-tail editorial layer with more hand-authored `editorial_enrichments` tiers.
3. Add custom image assets into the reserved illustration slots when the image set is ready.
4. Add classroom-ready downloads or slide decks after the printable kit pages have been tested.
