# CogBias

Static GitHub Pages site generator for a cognitive-biases sister site to LogFall.

## Current Model

- LogFall-like visual and navigational feel, rebuilt around cognitive biases instead of fallacies.
- Broad catalog seeded from Wikipedia's `List of cognitive biases`.
- Two organizing layers:
  - `categories/` for broad judgment tasks such as estimation, recall, and causal attribution.
  - `patterns/` for cross-cutting distortion shapes such as association, inertia, and outcome.
- New guided layers modeled on the strongest parts of LogFall:
  - `paths/` for curated learning routes.
  - `check-yourself/` for self-audit checklists.
  - `prompts/` for bias-aware AI prompt kits.
  - `theory/` for short framing essays.
- Illustration placeholders already reserved on bias detail pages for future image production.

## Source Of Truth

- Site metadata, taxonomy copy, featured entries, and countermoves:
  - `data/site.json`
- Generated bias catalog:
  - `data/biases.json`
- Richer hand-authored editorial sections for selected core entries:
  - `data/editorial_enrichments.json`
- Curated learning paths:
  - `data/learning_paths.json`
- Self-audit checklists:
  - `data/self_checks.json`
- Bias-aware prompt kits:
  - `data/prompt_kits.json`
- Theory page sections:
  - `data/theory_sections.json`
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
- Use `data/editorial_enrichments.json` to deepen especially important entries without losing the broad index.
- Use learning paths, self-checks, prompt kits, and theory notes to make the site feel like a real guided resource rather than a flat reference.
- Keep the image placeholder layout intact until the illustration set is ready.

## Next Likely Steps

1. Deepen additional high-value bias pages beyond the current core set in `data/editorial_enrichments.json`.
2. Decide whether prompt kits should stay static or gain copy-to-clipboard interactions.
3. Add custom image assets into the reserved illustration slots.
4. Set `siteUrl` in `data/site.json` before shipping sitemap and canonical URLs.
