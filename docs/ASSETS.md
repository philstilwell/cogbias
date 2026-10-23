# CogBias Assets

## Mira & Dex Comics

All 241 bias pages include a new comic below the existing poster. The source collection remains in the user's COGBIAS image folder; its PNG masters are not modified or committed.

- `data/bias_comics.json` maps each internal entry slug to its comic, alternative text, and original PNG checksum. Four public-route aliases are explicitly mapped by the importer.
- `site/assets/bias-comics/` holds web exports; the build copies these to `assets/bias-comics/`.
- `{public-slug}-comic.webp`: 768 × 1152 preview, WebP quality 88.
- `{public-slug}-comic-full.webp`: 1024 × 1536 larger image, WebP quality 94.
- The comic itself links to the full image. A simple caption directly underneath says "Click the image to view a larger version." The image and caption share a padded black section; there is no separate title or link block. Responsive image selection can also serve the full image on denser screens.
- Images retain the entire page, square corners, and any embedded color profile. They load lazily and have reserved dimensions to avoid shifting the layout.

To import reviewed additions or revisions, run `python3 scripts/import_comics.py /path/to/COGBIAS`, then `node scripts/build.mjs`. The importer uses the installed `cwebp` encoder, validates complete one-to-one coverage, and skips unchanged masters. Commit the manifest and both source and generated web exports together.

## Published Assets

The deployed site uses optimized assets committed to the repository:

- `site/assets/bias-posters/`: source poster JPEGs
- `assets/bias-posters/`: generated deploy copy
- `site/brand/`: source logo, favicon, Apple touch icon, Android icons, and related brand files
- `brand/`: generated deploy copy

Each bias poster should use this naming convention:

```text
bias-{bias-slug}-poster.jpg
```

The current poster set covers all `241` bias entries.

## Poster Format

- Aspect ratio: `2:3`
- Deployed JPEG size: `768 x 1152`
- Display behavior: full image, square image corners, no cropping, no rounded image corners
- Style: worded, vintage editorial teaching poster, blue/gold CogBias palette, visually specific to the relevant bias

## Local Production Assets

`production-assets/` contains local production material such as full-resolution PNG masters and contact sheets. It is ignored by Git.

Use it for:

- full-size poster masters
- intermediate contact sheets
- style-comparison sheets
- replacement candidates before JPEG conversion

Do not move production masters into the deployed `assets/` tree unless they have been intentionally converted and optimized.

## Replacing A Poster

1. Put the full-resolution working image in `production-assets/`.
2. Create the optimized JPEG at `site/assets/bias-posters/bias-{slug}-poster.jpg`.
3. Run `node scripts/build.mjs`.
4. Check the bias detail page, related-bias cards, and `/biases/`.
5. Commit both the source JPEG under `site/assets/` and the generated deploy copy under `assets/`.

## Captions

Image-specific featured-illustration captions live in:

```text
data/bias_illustration_captions.json
```

When a poster is replaced, review the matching caption so the page text describes the actual image rather than a prior concept.

## Brightness, Contrast, And Color Review — 2026-10-23

All 241 posters were visually reviewed. The 74 darker posters were adjusted from
their original 1024 × 1536 PNG masters; the other 167 web images were left unchanged.
The reference images were Mood-congruent memory bias, Moral credential, Moral luck,
Motonormativity, and Naïve cynicism, as selected by the site owner.

The correction uses smooth tonal curves and a moderated color adjustment to match
the references' cream highlights, dark outlines, and blue/gold colors. It changes
brightness, contrast, and saturation without regenerating artwork or lettering.
The original masters are preserved. Corrected full-resolution PNGs, a before/after
comparison, and the per-image audit are kept locally in
`production-assets/brightness-review/` (ignored by Git).

Web exports remain 768 × 1152 progressive JPEGs at their existing paths, with their
original compression settings and an embedded sRGB color profile. Source and
generated copies must continue to match. For any further correction, start from
an original PNG rather than applying the adjustment again to an edited JPEG.
