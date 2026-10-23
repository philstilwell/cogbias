"""Export the reviewed comic collection for the website, preserving the PNG masters."""

import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import shutil
import subprocess


ROOT = Path(__file__).resolve().parent.parent
ALIASES = {
    "compromise-effect": "compromise-effect-choices-affected-if-presented-as-extreme-or-average",
    "gender-eyewitness-memory": "gender-differences-in-eyewitness-memory",
    "regressive-bias": "conservatism-or-regressive-bias",
    "stereotype-memory-bias": "stereotype-bias-or-stereotypical-bias",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("collection", type=Path, help="Folder containing the PNGs and production/catalog.json")
    args = parser.parse_args()
    encoder = shutil.which("cwebp")
    if not encoder:
        raise SystemExit("cwebp is required to export the web images.")

    catalog = json.loads((args.collection / "production/catalog.json").read_text())
    scripts = {row[0]: row for row in json.loads((args.collection / "production/scripts.json").read_text())}
    entries = json.loads((ROOT / "data/biases.json").read_text())
    mapped = {ALIASES.get(item["slug"], item["slug"]) for item in catalog}
    if len(mapped) != len(catalog) or mapped != {entry["slug"] for entry in entries}:
        raise SystemExit("Comic catalog does not match the site's complete bias catalog.")
    missing = [item["image"] for item in catalog if not (args.collection / item["image"]).is_file()]
    if missing:
        raise SystemExit(f"Missing comic masters: {missing}")

    manifest_path = ROOT / "data/bias_comics.json"
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    destination = ROOT / "site/assets/bias-comics"
    destination.mkdir(parents=True, exist_ok=True)

    def export(item):
        slug = ALIASES.get(item["slug"], item["slug"])
        source = args.collection / item["image"]
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        preview = f"{item['slug']}-comic.webp"
        full = f"{item['slug']}-comic-full.webp"
        current = previous.get(slug, {})
        if current.get("sourceSha256") != digest or not all((destination / name).exists() for name in (preview, full)):
            for filename, options in (
                (preview, ["-q", "88", "-resize", "768", "1152"]),
                (full, ["-q", "94"]),
            ):
                subprocess.run(
                    [encoder, "-quiet", "-m", "6", "-sharp_yuv", "-metadata", "icc", *options,
                     str(source), "-o", str(destination / filename)], check=True,
                )
        return slug, {
            "number": item["number"],
            "preview": f"assets/bias-comics/{preview}",
            "full": f"assets/bias-comics/{full}",
            "width": 1024,
            "height": 1536,
            "alt": f"{item['name']} illustrated by Mira and Dex. {scripts[item['number']][3]}",
            "sourceSha256": digest,
        }

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        manifest = dict(pool.map(export, catalog))
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    total = sum(path.stat().st_size for path in destination.glob("*.webp"))
    print(f"Exported {len(manifest)} comics, each with a preview and full-resolution image ({total / 1_000_000:.1f} MB total).")


if __name__ == "__main__":
    main()
