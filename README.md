# CogBias

Static GitHub Pages site generator for a cognitive-biases sister site to LogFall.

## Current Model

- LogFall-like visual and navigational feel, rebuilt around cognitive biases instead of fallacies.
- Broad catalog seeded from Wikipedia's `List of cognitive biases`.
- Two organizing layers:
  - `categories/` for broad judgment tasks such as estimation, recall, and causal attribution.
  - `patterns/` for cross-cutting distortion shapes such as association, inertia, and outcome.
- Illustration placeholders already reserved on bias detail pages for future image production.

## Source Of Truth

- Site metadata, taxonomy copy, featured entries, and countermoves:
  - `data/site.json`
- Generated bias catalog:
  - `data/biases.json`
- Richer hand-authored overrides for selected core entries:
  - `data/deep_biases_overrides.json`
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
- Use `data/deep_biases_overrides.json` to deepen especially important entries without losing the broad index.
- Keep the image placeholder layout intact until the illustration set is ready.

## Next Likely Steps

1. Replace placeholder branding copy if a stronger public-facing name emerges.
2. Deepen the most important bias pages with richer original explanations and examples.
3. Add custom image assets into the reserved illustration slots.
4. Set `siteUrl` in `data/site.json` before shipping sitemap and canonical URLs.
