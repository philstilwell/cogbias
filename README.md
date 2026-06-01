# CogBias

CogBias is a static GitHub Pages site at [cogbias.site](https://cogbias.site/) for learning, comparing, and practicing cognitive-bias recognition. It uses a LogFall-inspired editorial poster style, a light-blue visual system, and a generated static-site architecture.

## Current Status

- Public site: `https://cogbias.site/`
- Repository: `https://github.com/philstilwell/cogbias.git`
- Deployment: GitHub Pages from the repository root
- Custom domain: `CNAME` contains `cogbias.site`
- Catalog: `241` cognitive bias pages
- Images: `241 / 241` poster JPEGs published in `assets/bias-posters/`
- Generated output: root-level HTML, CSS, JS, sitemap, manifest, brand assets, and poster assets

## Project Docs

- [PROJECT.md](PROJECT.md) is the durable project handoff: goals, decisions, architecture, counts, deployment, and next work.
- [docs/OPERATIONS.md](docs/OPERATIONS.md) covers build, verification, deployment, and analytics.
- [docs/ASSETS.md](docs/ASSETS.md) describes the image and brand asset layout.

## Build

Run the static generator from the repository root:

```sh
node scripts/build.mjs
```

Useful checks:

```sh
node --check scripts/build.mjs
node --check site/app.js
git diff --check
```

The generator reads source material from `data/`, shared frontend files from `site/`, and writes the published site to the repository root.

## Source Of Truth

- `scripts/build.mjs`: static-site generator
- `site/styles.css`: source stylesheet copied to root as `styles.css`
- `site/app.js`: source frontend behavior copied to root as `app.js`
- `site/assets/bias-posters/`: deployable poster JPEGs copied to root as `assets/bias-posters/`
- `site/brand/`: deployable logo, favicon, and manifest icon source copied to root as `brand/`
- `data/*.json`: catalog, enrichments, paths, assessments, comparison guides, teaching kits, theory articles, captions, and cross-site features

## Notes

`production-assets/` contains local full-resolution image masters and contact sheets. It is intentionally ignored by Git so the GitHub Pages deploy only carries optimized web assets.
