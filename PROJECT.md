# CogBias Project Handoff

## Purpose

CogBias is a cognitive-bias learning site built as a sister project to LogFall. The goal is not only to define biases, but to make them teachable through posters, examples, comparison guides, context hubs, self-checks, assessments, and classroom-ready kits.

The site should feel like a finished editorial learning resource, not a raw taxonomy export.

## Public Surface

- Primary URL: `https://cogbias.site/`
- GitHub Pages URL: `https://philstilwell.github.io/cogbias/`
- GitHub repository: `https://github.com/philstilwell/cogbias.git`
- Hosting: GitHub Pages from repository root
- DNS: `cogbias.site` points to GitHub Pages; `www` redirects to the apex domain
- Analytics: Cloudflare Web Analytics snippet is injected by `scripts/build.mjs`

## Current Inventory

- `241` cognitive bias entries
- `241` deployed poster JPEGs
- `241` Mira & Dex comics, each with a `768 × 1152` preview and a linked `1024 × 1536` WebP
- `75` assessment scenarios
- `19` theory articles
- `10` comparison guides
- `5` applied context hubs
- `5` teaching kits
- `324` generated HTML files

## Main Architecture

The source files live in `data/`, `scripts/`, and `site/`. The published GitHub Pages output is generated into the repository root.

`scripts/build.mjs` is the central generator. It:

- loads all tiered JSON data files
- merges editorial overlays
- builds the bias catalog pages
- builds index, category, pattern, path, assessment, comparison, context, theory, teaching-kit, map, prompt, case-study, and about pages
- emits SEO metadata, canonical links, Open Graph metadata, Twitter cards, JSON-LD, `sitemap.xml`, `robots.txt`, `site.webmanifest`, and redirect pages
- copies source assets from `site/` into the root deploy tree

## Editorial Model

The broad catalog starts from `data/biases.json`. Depth is layered through later JSON files rather than editing generated output by hand.

Important data layers:

- `data/editorial_enrichments*.json`: richer bias-page copy, route overrides, special evidence blocks, Slugfester features, and long-tail polish
- `data/entry_teaching_modules*.json`: quick checks, gauges, "What's happening here" sections, misuse warnings, practice labs, cases, and reading links
- `data/bias_card_summaries.json`: short card copy used in index and listing contexts
- `data/bias_illustration_captions.json`: image-specific featured-illustration captions
- `data/entry_sources*.json`: source metadata retained for internal/editorial use
- `data/learning_paths*.json` and `data/path_curriculum*.json`: path definitions and curriculum metadata
- `data/self_checks*.json` and `data/self_check_curriculum*.json`: self-audit material
- `data/assessment_bank*.json` and `data/assessment_metadata*.json`: assessment questions and filter metadata
- `data/comparison_guides.json`: high-confusion bias pair guides
- `data/domain_hubs.json`: domain-specific hubs such as news reading, teams, teaching, relationships, and product/UX
- `data/teaching_kits.json`: printable lesson and workshop kits
- `data/theory_articles*.json`: theory essay pages
- `data/prompt_kits*.json`: optional AI prompt tools, intentionally demoted from primary navigation

## Locked-In Product Decisions

- Use the custom `cogbias.site` domain as the primary canonical site URL.
- Keep the LogFall-adjacent visual language, but with CogBias blue and gold branding.
- Show every bias with a full 2:3 poster image and square image corners.
- Show the matching Mira & Dex comic below the existing poster. On desktop, stack Quick check, Mechanism snapshot, classification, and Reference use in the left column, ending alongside the illustration column. On mobile, show introduction, illustrations, then these notes in one column.
- Both the comic itself and its "View larger image" link open the full-resolution export in a new tab.
- Keep prompts as a secondary tool, not a primary navigation pillar.
- Do not show weak inferred case studies or generic context blocks on thin pages.
- Use `Classic demonstrations` or `Applied contexts` for experimental-memory pages where a normal case-study block would be misleading.
- Do not show public source-trail blocks on bias pages.
- Use `What's happening here` rather than the LogFall-style "That's like saying" language.
- Keep image masters in local production assets or the source collection; deploy optimized JPEGs for posters and WebP for comics.

## Build And Verification

Standard local build:

```sh
node scripts/build.mjs
```

Standard checks:

```sh
node --check scripts/build.mjs
node --check site/app.js
git diff --check
```

Recommended spot checks after significant changes:

- `/`
- `/biases/`
- `/biases/confirmation-bias/`
- `/biases/zero-sum-bias/`
- `/assessment/`
- `/map/`
- `/contexts/product-ux/`
- `/compare/confirmation-bias-vs-motivated-reasoning/`
- `/teaching-kits/`
- `/theory/biases-before-arguments/`

## Commit Discipline

Generated root output is committed because GitHub Pages deploys from the root. When changing source files under `data/`, `site/`, or `scripts/`, rebuild before committing so source and output stay aligned.

Do not edit generated root HTML manually unless the generator is also updated.

## Current Risks And Next Useful Work

- Some long-tail bias pages remain lighter than the flagship pages. Improve them through new `data/editorial_enrichments*.json` overlays.
- Some case-study analogs are intentionally withheld where the match would be weak. Prefer no block over a misleading block.
- The image set is complete, but individual posters can still be replaced when visual defects are found.
- Assessment scenarios are strong enough for public use, but additional context-specific questions would improve training depth.
- The map is useful, but future work could add export/share controls or saved axis presets.
- Source metadata exists internally, but public source-trail blocks were removed by design.

## Project Resume Prompt

Use this when starting a fresh Codex thread:

```text
Work in /Users/philstilwell/Documents/Codex/2026-05-23/can-you-access-the-assets-in/biasfall-repo. This is the CogBias static GitHub Pages project. Read README.md and PROJECT.md first. Preserve the generator-driven workflow: edit data/site/scripts source, run node scripts/build.mjs, verify, then commit generated root output with source changes.
```
