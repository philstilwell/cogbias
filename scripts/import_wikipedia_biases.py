#!/usr/bin/env python3

import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, List
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SOURCE_URL = "https://en.wikipedia.org/wiki/List_of_cognitive_biases"
USER_AGENT = "Codex/1.0 (educational site research; respectful fetch for structured import)"

TASK_DESCRIPTIONS = {
    "Estimation": "Biases that distort numerical judgment, risk perception, calibration, and first-pass estimates.",
    "Decision": "Biases that shape choices, commitments, avoidance, preference drift, and action under uncertainty.",
    "Hypothesis Assessment": "Biases that skew how people interpret evidence, test explanations, and evaluate claims.",
    "Causal Attribution": "Biases that bend explanations about why events happened and who or what caused them.",
    "Recall": "Biases that selectively reshape memory, retrieval, and retrospective interpretation.",
    "Opinion Reporting": "Biases that distort what people say they believe, prefer, or remember believing.",
}

PATTERN_DESCRIPTIONS = {
    "Association": "The mind overweights resemblance, proximity, vividness, or intuitive linkage.",
    "Baseline": "Judgment is pulled by the wrong starting point, default expectation, or prior frame.",
    "Inertia": "Beliefs or choices resist updating even when movement would be better grounded.",
    "Outcome": "The result of an event bends how the process, evidence, or alternatives are interpreted.",
    "Self-Perspective": "The bias is intensified by self-protection, ego, identity, or asymmetry between self and others.",
}

TASK_NAME_OVERRIDES = {
    "Hypothesis assessment": "Hypothesis Assessment",
    "Causal attribution": "Causal Attribution",
    "Opinion reporting": "Opinion Reporting",
}

PATTERN_NAME_OVERRIDES = {
    "Self-perspective": "Self-Perspective",
}

NAME_OVERRIDES = {
    "availability heuristic (also known as the availability bias)": {
        "name": "Availability heuristic",
        "aliases": ["Availability bias"],
    },
    "anchoring bias, or focalism": {
        "name": "Anchoring effect",
        "aliases": ["Anchoring bias", "Focalism"],
    },
    "base rate fallacy or base rate neglect": {
        "name": "Base-rate neglect",
        "aliases": ["Base-rate fallacy"],
    },
    "base rate fallacy": {
        "name": "Base-rate neglect",
        "aliases": ["Base-rate fallacy"],
        "slug": "base-rate-neglect",
    },
    "hot-hand fallacy (also known as \"hot hand phenomenon\" or \"hot hand\")": {
        "name": "Hot-hand fallacy",
        "aliases": ["Hot hand phenomenon", "Hot hand"],
    },
    "interoceptive bias or hungry judge effect": {
        "name": "Interoceptive bias",
        "aliases": ["Hungry judge effect"],
    },
    "escalation of commitment, irrational escalation, or sunk cost fallacy": {
        "name": "Sunk cost effect",
        "aliases": ["Escalation of commitment", "Irrational escalation", "Sunk cost fallacy"],
        "slug": "sunk-cost-effect",
    },
    "escalation of commitment": {
        "name": "Sunk cost effect",
        "aliases": ["Escalation of commitment", "Irrational escalation", "Sunk cost fallacy"],
        "slug": "sunk-cost-effect",
    },
    "unconscious bias or implicit bias": {
        "name": "Implicit bias",
        "aliases": ["Unconscious bias"],
    },
    "unconscious bias": {
        "name": "Implicit bias",
        "aliases": ["Unconscious bias"],
        "slug": "implicit-bias",
    },
    "experimenter's": {
        "name": "Experimenter's bias",
        "aliases": ["Expectation bias"],
        "slug": "experimenters-bias",
    },
    "barnum effect or forer effect": {
        "name": "Barnum effect",
        "aliases": ["Forer effect"],
    },
    "curse of knowledge": {
        "name": "Curse of knowledge",
    },
    "hindsight bias, also known as the knew-it-all-along effect or creeping determinism": {
        "name": "Hindsight bias",
        "aliases": ["Knew-it-all-along effect", "Creeping determinism"],
    },
    "actor-observer bias": {
        "name": "Fundamental attribution error",
        "aliases": ["Actor-observer bias"],
        "slug": "fundamental-attribution-error",
    },
    "self-serving bias": {
        "name": "Self-serving bias",
    },
    "negativity bias or negativity effect": {
        "name": "Negativity bias",
        "aliases": ["Negativity effect"],
        "slug": "negativity-bias",
    },
    "status quo bias": {
        "name": "Status quo bias",
        "slug": "status-quo-bias",
    },
    "dunning–kruger effect": {
        "name": "Dunning-Kruger effect",
        "aliases": ["Dunning–Kruger effect"],
        "slug": "dunning-kruger-effect",
    },
}

UNSEEDED_OVERRIDE_METADATA = {
    "motivated-reasoning": {
        "tasks": ["Hypothesis Assessment"],
        "patterns": ["Self-Perspective"],
        "sourceLabel": "Editorial addition",
        "sourceUrl": SOURCE_URL,
    }
}


def clean_text(text: str) -> str:
    text = re.sub(r"\[\s*\d+\s*\]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace(" ,", ",").replace(" :", ":")
    return text


def slugify(text: str) -> str:
    value = unicodedata.normalize("NFKD", text)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.replace("'", "")
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")


def first_sentence(text: str) -> str:
    match = re.search(r"\.(?:\s|$)", text)
    if not match:
        return text.strip()
    return text[: match.start()].strip()


def infer_name(text: str) -> str:
    text = first_sentence(text).rstrip(".").strip()
    patterns = [
        " is the tendency",
        " is the perception",
        " is people's inclination",
        " is a ",
        " is an ",
        " is ",
        " is characterization",
        " are the tendency",
        " are initial beliefs",
        " are ",
        " occurs where",
        " occurs when",
        " occurs ",
        ", the tendency",
        ", a tendency",
        ", the belief",
        ", the inclination",
        ", just as ",
        ", the ",
        ", a ",
        ", an ",
        ", when ",
        ": ",
        ", which ",
        ", where ",
        ", our ",
        ", an effect",
        ", a widespread",
        ", the preference",
        ", failure to ",
        ", irrational ",
    ]
    cut = len(text)
    for pattern in patterns:
        idx = text.find(pattern)
        if idx != -1:
            cut = min(cut, idx)
    name = text[:cut].strip(" .,:;")
    name = re.sub(r"^The\s+", "", name)
    return name


def extract_aliases(name: str) -> List[str]:
    aliases: List[str] = []
    match = re.search(r"\((also known as|also called)\s+(.+?)\)$", name, flags=re.I)
    if match:
        alias_text = match.group(2).strip()
        alias_text = alias_text.strip('"')
        aliases.extend([clean_alias(part) for part in re.split(r"\s+or\s+|,\s*", alias_text) if clean_alias(part)])
        name = name[: match.start()].strip()
    return aliases


def clean_alias(alias: str) -> str:
    alias = alias.strip(' "()[]')
    alias = re.sub(r"^the\s+", "", alias, flags=re.I)
    return alias.strip()


def dedupe_aliases_for_name(name: str, aliases: List[str]) -> List[str]:
    slug = slugify(name)
    deduped_aliases = {}
    for alias in aliases:
        if not alias:
            continue
        alias_slug = slugify(alias)
        if not alias_slug or alias_slug == slug:
            continue
        deduped_aliases.setdefault(alias_slug, alias)
    return sorted(deduped_aliases.values(), key=str.lower)


def extract_lead_aliases(lead_text: str, name: str) -> List[str]:
    if not name or not lead_text.lower().startswith(name.lower()):
        return []

    tail = lead_text[len(name) :].strip(" .,:;")
    if not tail:
        return []

    alias_blob = ""
    if tail.lower().startswith("or "):
        alias_blob = tail[3:]
    else:
        match = re.match(r"^\(?\s*(?:also known as|also called)\s+(.+?)\)?$", tail, flags=re.I)
        if not match:
            match = re.match(r"^,\s*(?:also known as|also called)\s+(.+)$", tail, flags=re.I)
        if not match:
            match = re.match(r"^,\s*or\s+(.+)$", tail, flags=re.I)
        if match:
            alias_blob = match.group(1)

    if not alias_blob:
        return []

    alias_blob = alias_blob.split(": ", 1)[0]
    alias_blob = alias_blob.split(". ", 1)[0]
    for marker in [", the ", ", a ", ", an ", ", when ", ", which ", ", even when "]:
        if marker in alias_blob:
            alias_blob = alias_blob.split(marker, 1)[0]
            break
    aliases = []
    for part in re.split(r"\s+or\s+|,\s*", alias_blob):
        alias = clean_alias(part)
        if alias:
            aliases.append(alias)
    return aliases


def parse_list_page() -> List[Dict]:
    response = requests.get(SOURCE_URL, headers={"User-Agent": USER_AGENT}, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    content = soup.select_one("#mw-content-text .mw-parser-output")

    current_task = None
    current_pattern = None
    raw_entries = []
    ignored_sections = {
        "Organization of cognitive biases",
        "See also",
        "Footnotes",
        "References",
        "Further reading",
        "External links",
    }

    for element in content.find_all(["h2", "h3", "ul"]):
        if element.name == "h2":
            title = clean_text(element.get_text(" ", strip=True).replace("[edit]", ""))
            if title in ignored_sections:
                current_task = None
                current_pattern = None
            else:
                current_task = title
                current_pattern = None
        elif element.name == "h3" and current_task:
            current_pattern = clean_text(element.get_text(" ", strip=True).replace("[edit]", ""))
        elif element.name == "ul" and current_task and current_pattern:
            for item in element.find_all("li", recursive=False):
                text = clean_text(item.get_text(" ", strip=True))
                href = ""
                primary_anchor = ""
                for anchor in item.find_all("a", href=True):
                    href_candidate = anchor["href"]
                    anchor_text = clean_text(anchor.get_text(" ", strip=True))
                    if not primary_anchor and anchor_text and not anchor_text.startswith("["):
                        primary_anchor = anchor_text
                    if not href and (
                        href_candidate.startswith("/wiki/")
                        or href_candidate.startswith("/w/index.php?")
                    ):
                        href = urljoin("https://en.wikipedia.org/", href_candidate)
                raw_entries.append(
                    {
                        "task": TASK_NAME_OVERRIDES.get(current_task, current_task),
                        "pattern": PATTERN_NAME_OVERRIDES.get(current_pattern, current_pattern),
                        "text": text,
                        "leadText": first_sentence(text),
                        "primaryAnchor": primary_anchor,
                        "sourceUrl": href or SOURCE_URL,
                    }
                )

    return raw_entries


def load_overrides() -> Dict[str, Dict]:
    path = DATA_DIR / "deep_biases_overrides.json"
    if not path.exists():
        return {}

    overrides = json.loads(path.read_text())
    return {entry["slug"]: entry for entry in overrides}


def generic_entry(name: str, slug: str, summary: str, task: str, pattern: str, source_url: str) -> Dict:
    task_description = TASK_DESCRIPTIONS[task]
    pattern_description = PATTERN_DESCRIPTIONS[pattern]
    return {
        "name": name,
        "slug": slug,
        "aliases": [],
        "tasks": [task],
        "patterns": [pattern],
        "summary": summary,
        "mechanism": f"Wikipedia groups this bias under {task.lower()} and the {pattern.lower()} pattern, which suggests a distortion driven by {pattern_description.lower()}",
        "distortion": task_description,
        "commonTrigger": f"Situations where {task.lower()} is already difficult and the {pattern.lower()} cue feels easier to trust than a fuller review.",
        "firstCountermove": f"Start with the {task.lower()} question instead of the first intuitive answer, then check whether the {pattern.lower()} pattern is doing invisible work.",
        "sourceLabel": "Wikipedia",
        "sourceUrl": source_url,
    }


def normalize_entry(raw: Dict) -> Dict:
    raw_text = raw["text"]
    lead_text = raw.get("leadText") or raw_text
    primary_anchor = clean_text(raw.get("primaryAnchor", ""))

    if primary_anchor and raw_text.lower().startswith(primary_anchor.lower()):
        name = primary_anchor
        aliases = extract_lead_aliases(lead_text, primary_anchor)
    else:
        inferred_name = infer_name(lead_text)
        aliases = extract_aliases(inferred_name)
        name = re.sub(r"\((.+?)\)$", "", inferred_name).strip()

    override = None
    for key in [name.lower(), lead_text.lower(), raw_text.lower()]:
        override = NAME_OVERRIDES.get(key)
        if override:
            break
    if override:
        aliases.extend(override.get("aliases", []))
        name = override["name"]
        slug = override.get("slug", slugify(name))
    else:
        name = name[0].upper() + name[1:] if name else name
        slug = slugify(name)
    aliases = dedupe_aliases_for_name(name, aliases)
    return {"name": name, "slug": slug, "aliases": aliases}


def derive_summary(raw_text: str, normalized_name: str) -> str:
    summary = raw_text

    if summary.startswith(normalized_name):
        summary = summary[len(normalized_name) :].lstrip(" ,:-")
        if summary.lower().startswith("or ") or summary.lower().startswith("also known as"):
            if ". " in summary:
                summary = summary.split(". ", 1)[1]
            else:
                summary = ""
        elif summary.startswith("("):
            closing = summary.find(")")
            if closing != -1:
                summary = summary[closing + 1 :].lstrip(" ,:-")
    elif ": " in raw_text:
        prefix, remainder = raw_text.split(": ", 1)
        if normalized_name.lower() in prefix.lower():
            summary = remainder
    elif ", " in raw_text:
        prefix, remainder = raw_text.split(", ", 1)
        if " or " in prefix and normalized_name.lower() not in prefix.lower():
            summary = remainder

    summary = clean_text(summary).strip(" .")
    if not summary or summary == ".":
        for marker in [": ", ", ", " is ", " are ", " occurs "]:
            if marker in raw_text:
                summary = clean_text(raw_text.split(marker, 1)[1]).rstrip(".")
                break
    if not summary:
        summary = "Wikipedia lists this item as a cognitive bias or closely related judgment distortion."
    if summary.lower().startswith("is "):
        summary = summary[3:].strip()
    if summary.lower().startswith("are "):
        summary = summary[4:].strip()
    if summary.lower().startswith("occurs where "):
        summary = "When " + summary[13:].strip()
    if summary.lower().startswith("occurs when "):
        summary = "When " + summary[12:].strip()
    summary = summary.strip(" .")
    if summary:
        summary = summary[0].upper() + summary[1:]
    return summary


def merge_with_overrides(entries: List[Dict], overrides_by_slug: Dict[str, Dict]) -> List[Dict]:
    merged = []
    used_override_slugs = set()

    for entry in entries:
        override = overrides_by_slug.get(entry["slug"])
        if override:
            used_override_slugs.add(entry["slug"])
            combined = dict(override)
            combined["name"] = entry["name"]
            combined["slug"] = entry["slug"]
            combined["aliases"] = dedupe_aliases_for_name(
                combined["name"],
                [*(entry.get("aliases", [])), *(override.get("aliases", []))],
            )
            combined["tasks"] = entry["tasks"]
            combined["patterns"] = entry["patterns"]
            combined["summary"] = override.get("summary") or entry["summary"]
            combined["sourceLabel"] = "Wikipedia"
            combined["sourceUrl"] = entry["sourceUrl"]
            merged.append(combined)
        else:
            merged.append(entry)

    for slug, override in overrides_by_slug.items():
        if slug in used_override_slugs:
            continue
        metadata = UNSEEDED_OVERRIDE_METADATA.get(slug)
        if not metadata:
            continue
        combined = dict(override)
        combined["tasks"] = metadata["tasks"]
        combined["patterns"] = metadata["patterns"]
        combined["sourceLabel"] = metadata["sourceLabel"]
        combined["sourceUrl"] = metadata["sourceUrl"]
        merged.append(combined)

    return sorted(merged, key=lambda item: item["name"].lower())


def build_bias_catalog() -> List[Dict]:
    overrides_by_slug = load_overrides()
    aggregated: Dict[str, Dict] = {}

    for raw in parse_list_page():
        normalized = normalize_entry(raw)
        summary = derive_summary(raw["text"], normalized["name"])
        base = generic_entry(
            normalized["name"],
            normalized["slug"],
            summary,
            raw["task"],
            raw["pattern"],
            raw["sourceUrl"],
        )
        base["aliases"] = normalized["aliases"]

        if normalized["slug"] not in aggregated:
            aggregated[normalized["slug"]] = base
        else:
            record = aggregated[normalized["slug"]]
            record["tasks"] = sorted({*record["tasks"], raw["task"]})
            record["patterns"] = sorted({*record["patterns"], raw["pattern"]})
            record["aliases"] = sorted({*record.get("aliases", []), *normalized["aliases"]})

    return merge_with_overrides(list(aggregated.values()), overrides_by_slug)


def main() -> None:
    catalog = build_bias_catalog()
    output_path = DATA_DIR / "biases.json"
    output_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(catalog)} biases to {output_path}")


if __name__ == "__main__":
    main()
