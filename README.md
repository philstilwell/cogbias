# BiasFall

Static GitHub Pages starter for a cognitive-biases sister site to LogFall.

## What This Starter Keeps

- A static, generator-driven architecture that publishes plain HTML/CSS/JS at the repo root.
- One structured content source for the site rather than hand-editing dozens of pages.
- Searchable index pages, category pages, and entry detail pages.
- Lightweight client-side filtering that works on GitHub Pages without a framework.

## What This Starter Changes

- The content model is bias-first rather than fallacy-first.
- Each bias page focuses on the mental shortcut, common triggers, decision distortion, and countermeasures.
- The site adds a bias-specific `countermoves/` section and removes fallacy-specific teaching flows such as dialogue assessment and argument repair.
- Branding, metadata, and navigation are now configurable from local JSON instead of being hardwired to LogFall.

## Source Of Truth

- Site metadata: `data/site.json`
- Bias entries: `data/biases.json`
- Build script: `scripts/build.mjs`
- Shared front-end assets: `site/styles.css`, `site/app.js`

## Build

1. Run:
   - `node scripts/build.mjs`
2. Open the generated site at:
   - `index.html`

No external packages are required for the current starter build.

## Architecture Notes

- Repo root is the published output for GitHub Pages.
- `site/` contains reusable front-end assets copied into the published root at build time.
- `data/` is designed to stay small and hand-editable while the taxonomy is still evolving.

## Suggested Next Steps

1. Finalize the public name, domain, and visual identity.
2. Expand `data/biases.json` from the starter set into the real catalog.
3. Decide whether to add original illustrations, printable handouts, or worksheets.
4. Add richer cross-links once the category system stabilizes.
