#!/usr/bin/env python3

import argparse
import base64
import io
import json
import os
import sys
import time
from pathlib import Path

from PIL import Image
from openai import OpenAI


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
POSTER_DIR = ROOT / "site" / "assets" / "bias-posters"
DEFAULT_INPUT = DATA_DIR / "biases.json"
DEFAULT_OUTPUT = DATA_DIR / "bias_illustration_captions.json"
MODEL = "gpt-4.1-mini"
MAX_SIDE = 512


PROMPT = (
    "You are writing the Featured Illustration caption for a cognitive-bias website. "
    "For each item, inspect the actual image, including visible text and composition. "
    "Write exactly 2 sentences totaling 30 to 60 words. Mention 2 to 4 concrete visual elements "
    "and explain how those elements enact the bias. Avoid generic openings like 'This poster shows' "
    "or 'The poster.' Return only strict JSON."
)


SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string"},
                    "caption": {"type": "string"},
                },
                "required": ["slug", "caption"],
                "additionalProperties": False,
            }
        }
    },
    "required": ["items"],
    "additionalProperties": False,
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def resize_image_bytes(path: Path) -> bytes:
    image = Image.open(path).convert("RGB")
    width, height = image.size
    scale = min(1.0, MAX_SIDE / max(width, height))
    if scale < 1.0:
        image = image.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=82, optimize=True)
    return buffer.getvalue()


def make_content(batch):
    content = [{"type": "input_text", "text": PROMPT}]
    for entry in batch:
        poster_path = POSTER_DIR / f"bias-{entry['slug']}-poster.jpg"
        image_bytes = resize_image_bytes(poster_path)
        image_b64 = base64.b64encode(image_bytes).decode("ascii")
        content.append(
            {
                "type": "input_text",
                "text": (
                    f"slug: {entry['slug']}\n"
                    f"title: {entry['name']}\n"
                    f"summary: {entry['summary']}\n"
                ),
            }
        )
        content.append(
            {
                "type": "input_image",
                "image_url": f"data:image/jpeg;base64,{image_b64}",
                "detail": "low",
            }
        )
    return content


def request_captions(client: OpenAI, batch):
    response = client.responses.create(
        model=MODEL,
        input=[{"role": "user", "content": make_content(batch)}],
        text={
            "format": {
                "type": "json_schema",
                "name": "illustration_captions",
                "schema": SCHEMA,
            }
        },
    )
    payload = json.loads(response.output_text)
    items = payload.get("items", [])
    expected = {entry["slug"] for entry in batch}
    returned = {item.get("slug") for item in items}
    if returned != expected:
        raise ValueError(f"Caption batch mismatch. Expected {sorted(expected)} got {sorted(returned)}")
    return {item["slug"]: item["caption"].strip() for item in items}


def iter_batches(items, size):
    for index in range(0, len(items), size):
        yield items[index : index + size]


def main():
    parser = argparse.ArgumentParser(description="Generate image-specific illustration captions for bias posters.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is not set.")

    entries = load_json(args.input)
    existing = {} if args.overwrite or not args.output.exists() else load_json(args.output)

    pending = []
    for entry in entries:
        poster_path = POSTER_DIR / f"bias-{entry['slug']}-poster.jpg"
        if not poster_path.exists():
            continue
        if entry["slug"] in existing:
            continue
        pending.append(entry)

    if args.limit > 0:
        pending = pending[: args.limit]

    if not pending:
        print("No pending captions.")
        return

    client = OpenAI()
    total = len(pending)
    done = 0

    for batch_index, batch in enumerate(iter_batches(pending, args.batch_size), start=1):
        for attempt in range(1, 4):
            try:
                captions = request_captions(client, batch)
                existing.update(captions)
                save_json(args.output, dict(sorted(existing.items())))
                done += len(batch)
                print(f"Batch {batch_index}: saved {done}/{total} pending captions")
                break
            except Exception as exc:  # noqa: BLE001
                if attempt >= 3:
                    raise
                print(f"Batch {batch_index} attempt {attempt} failed: {exc}", file=sys.stderr)
                time.sleep(2 * attempt)


if __name__ == "__main__":
    main()
