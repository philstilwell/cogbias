# CogBias Operations

## Local Build

Run from the repository root:

```sh
node scripts/build.mjs
```

The build removes and regenerates owned output directories such as `biases/`, `categories/`, `contexts/`, `compare/`, `paths/`, `theory/`, `assets/`, `brand/`, and root files such as `index.html`, `styles.css`, `app.js`, `sitemap.xml`, `robots.txt`, and `site.webmanifest`.

## Standard Verification

Use these checks after source edits:

```sh
node --check scripts/build.mjs
node --check site/app.js
node scripts/build.mjs
git diff --check
```

For frontend behavior changes, also inspect representative pages in a browser:

- `/biases/`
- `/biases/confirmation-bias/`
- `/assessment/`
- `/map/`
- `/contexts/product-ux/`
- `/compare/confirmation-bias-vs-motivated-reasoning/`

## Deployment

Deployment is by pushing `main` to GitHub:

```sh
git push origin main
```

GitHub Pages serves from the repository root. The generated output must be committed along with the source changes that produced it.

## Domain And SEO

- `CNAME` sets the custom domain to `cogbias.site`.
- `scripts/build.mjs` emits canonical URLs, Open Graph metadata, Twitter cards, JSON-LD, `sitemap.xml`, and `robots.txt`.
- Redirect pages are generated for route aliases and use `noindex,nofollow,noarchive`.
- Cloudflare Web Analytics is injected from the shared head renderer and redirect template.

## Editing Rules

- Prefer changing JSON source data or generator code over editing generated HTML.
- Keep poster image paths stable: `assets/bias-posters/bias-{slug}-poster.jpg`.
- Keep source poster JPEGs under `site/assets/bias-posters/`; the build copies them into root `assets/`.
- Keep full-size PNG masters in `production-assets/`; they are ignored by Git.
- After replacing any poster, rebuild and check at least one bias detail page and the all-biases index.

## Release Checklist

1. Edit source files.
2. Run `node scripts/build.mjs`.
3. Run syntax and whitespace checks.
4. Inspect representative generated pages.
5. Commit source and generated output together.
6. Push `main`.
7. Spot-check `https://cogbias.site/` after GitHub Pages updates.
