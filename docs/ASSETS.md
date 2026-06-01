# CogBias Assets

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
