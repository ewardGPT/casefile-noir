#!/usr/bin/env python3
"""
validate_tmx.py

Scans a folder for Tiled TMX maps and validates:
- TMX XML loads
- referenced TSX exists (if external tilesets)
- tileset images exist (supports <image source="...">)
- detects required layers (Collisions, Entities, Ground, etc.)
- prints PASS/FAIL report

Usage:
  python validate_tmx.py --in "." --require Collisions Entities Ground

Notes:
- Works for:
  - TMX with inline tilesets
  - TMX with external TSX tilesets
- Does NOT require Tiled installed.

"""

from __future__ import annotations
import argparse
from pathlib import Path
import xml.etree.ElementTree as ET


def read_xml(path: Path) -> ET.Element:
    return ET.parse(path).getroot()


def resolve_rel(base: Path, rel: str) -> Path:
    rel = rel.replace("\\", "/")
    # ignore weird empty sources
    if not rel.strip():
        return Path("")
    return (base / rel).resolve()


def find_layers(root: ET.Element) -> set[str]:
    names = set()
    for tag in ["layer", "objectgroup", "imagelayer", "group"]:
        for el in root.findall(tag):
            n = el.attrib.get("name")
            if n:
                names.add(n)
    return names


def tileset_images_from_tsx(tsx_path: Path) -> list[Path]:
    images = []
    try:
        tsx_root = read_xml(tsx_path)
    except Exception:
        return images

    # tileset image at top level
    for img in tsx_root.findall("image"):
        src = img.attrib.get("source", "")
        images.append(resolve_rel(tsx_path.parent, src))

    # per-tile images (rare, collection of images)
    for tile in tsx_root.findall("tile"):
        for img in tile.findall("image"):
            src = img.attrib.get("source", "")
            images.append(resolve_rel(tsx_path.parent, src))

    return images


def tileset_images_inline_from_tmx(tmx_root: ET.Element, tmx_path: Path) -> list[Path]:
    images = []

    for tileset in tmx_root.findall("tileset"):
        # inline tileset image
        for img in tileset.findall("image"):
            src = img.attrib.get("source", "")
            images.append(resolve_rel(tmx_path.parent, src))

        # per-tile images
        for tile in tileset.findall("tile"):
            for img in tile.findall("image"):
                src = img.attrib.get("source", "")
                images.append(resolve_rel(tmx_path.parent, src))

    return images


def validate_one_tmx(tmx_path: Path, required_layers: list[str]) -> dict:
    result = {
        "tmx": str(tmx_path),
        "ok": True,
        "errors": [],
        "warnings": [],
        "layers_found": [],
        "tsx_files": [],
        "images_found": [],
    }

    # parse tmx
    try:
        root = read_xml(tmx_path)
    except Exception as e:
        result["ok"] = False
        result["errors"].append(f"TMX XML parse failed: {e}")
        return result

    layers = find_layers(root)
    result["layers_found"] = sorted(layers)

    # check required layers
    for req in required_layers:
        if req not in layers:
            result["ok"] = False
            result["errors"].append(f"Missing required layer: {req}")

    # tilesets
    tileset_nodes = root.findall("tileset")
    if not tileset_nodes:
        result["ok"] = False
        result["errors"].append("No <tileset> found in TMX.")

    # external TSX or inline?
    external_tsx = []
    inline_tileset_images = []

    for ts in tileset_nodes:
        src = ts.attrib.get("source")
        if src:
            tsx_path = resolve_rel(tmx_path.parent, src)
            external_tsx.append(tsx_path)
        else:
            # inline tileset
            inline_tileset_images.extend(tileset_images_inline_from_tmx(root, tmx_path))

    # validate TSX files and their images
    for tsx in external_tsx:
        result["tsx_files"].append(str(tsx))
        if not tsx.exists():
            result["ok"] = False
            result["errors"].append(f"Missing TSX file: {tsx}")
            continue

        imgs = tileset_images_from_tsx(tsx)
        if not imgs:
            result["warnings"].append(f"No <image> tags found inside TSX: {tsx}")
        for img in imgs:
            result["images_found"].append(str(img))
            if not img.exists():
                result["ok"] = False
                result["errors"].append(f"Missing tileset image referenced by TSX: {img}")

    # validate inline images
    for img in inline_tileset_images:
        result["images_found"].append(str(img))
        if not img.exists():
            result["ok"] = False
            result["errors"].append(f"Missing tileset image referenced inline by TMX: {img}")

    # extra sanity checks
    w = root.attrib.get("width")
    h = root.attrib.get("height")
    tw = root.attrib.get("tilewidth")
    th = root.attrib.get("tileheight")

    if not (w and h and tw and th):
        result["warnings"].append("TMX missing width/height/tilewidth/tileheight attributes.")

    else:
        try:
            iw, ih, itw, ith = int(w), int(h), int(tw), int(th)
            if iw <= 0 or ih <= 0:
                result["ok"] = False
                result["errors"].append(f"Invalid map size: {iw}x{ih}")
            if itw not in (8, 16, 32, 64):
                result["warnings"].append(f"Unusual tilewidth: {itw}")
            if ith not in (8, 16, 32, 64):
                result["warnings"].append(f"Unusual tileheight: {ith}")
        except Exception:
            result["warnings"].append("Could not parse width/height/tilewidth/tileheight as ints.")

    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_dir", default=".", help="Folder to scan (default .)")
    ap.add_argument(
        "--require",
        nargs="*",
        default=[],
        help='Required layer names. Example: --require Collisions Entities Ground',
    )
    ap.add_argument("--max", type=int, default=2000, help="Max TMX files to scan")
    args = ap.parse_args()

    base = Path(args.in_dir).expanduser().resolve()
    tmx_files = sorted(base.rglob("*.tmx"))[: args.max]

    if not tmx_files:
        print(f"No TMX files found under: {base}")
        return

    print(f"Scanning {len(tmx_files)} TMX file(s) under: {base}\n")

    passed = 0
    failed = 0

    for tmx in tmx_files:
        res = validate_one_tmx(tmx, args.require)

        status = "PASS ✅" if res["ok"] else "FAIL ❌"
        print("=" * 90)
        print(f"{status}  {tmx.relative_to(base)}")

        if res["errors"]:
            print("  Errors:")
            for e in res["errors"]:
                print(f"   - {e}")

        if res["warnings"]:
            print("  Warnings:")
            for w in res["warnings"]:
                print(f"   - {w}")

        print(f"  Layers found: {', '.join(res['layers_found']) if res['layers_found'] else '(none)'}")

        if res["ok"]:
            passed += 1
        else:
            failed += 1

    print("\n" + "=" * 90)
    print(f"Done. PASS={passed}  FAIL={failed}")


if __name__ == "__main__":
    main()
