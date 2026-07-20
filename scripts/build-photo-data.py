#!/usr/bin/env python3
"""Scan ~/Pictures for selected JPGs, copy to assets/photo/, generate photo-data.js."""

import os
import shutil
import json
import re
from PIL import Image
from PIL.ExifTags import TAGS
from datetime import datetime

PICTURES_ROOT = os.path.expanduser("~/Pictures")
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTO_DIR = os.path.join(PROJECT_ROOT, "assets", "photo")
OUTPUT_JS = os.path.join(PROJECT_ROOT, "assets", "photo-data.js")

LOCATION_MAP = {
    "yx":    {"country": "中国", "province": "陕西省", "city": "汉中市", "district": "洋县"},
    "cgx":   {"country": "中国", "province": "陕西省", "city": "汉中市", "district": "城固县"},
    "htq":   {"country": "中国", "province": "陕西省", "city": "汉中市", "district": "汉台区"},
    "nzq":   {"country": "中国", "province": "陕西省", "city": "汉中市", "district": "南郑区"},
    "xxx":   {"country": "中国", "province": "陕西省", "city": "汉中市", "district": "西乡县"},
    "cdcwq": {"country": "中国", "province": "四川省", "city": "成都市", "district": "城五区"},
    "cddjy": {"country": "中国", "province": "四川省", "city": "成都市", "district": "都江堰市"},
    "myjy":  {"country": "中国", "province": "四川省", "city": "绵阳市", "district": "江油市"},
}

COLLECTION_MAP = {
    "yx":  "郊野",
    "cgx": "郊野",
    "htq": "城市",
    "nzq": "水与光",
    "xxx": "郊野",
    "cdcwq": "城市",
    "cddjy": "水与光",
    "myjy": "郊野",
}

def get_exif(filepath):
    """Read EXIF tags from a JPEG using Pillow."""
    try:
        img = Image.open(filepath)
        exif_data = img._getexif()
        if not exif_data:
            return {}
        result = {}
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, str(tag_id))
            result[tag_name] = value
        return result
    except Exception:
        return {}

def format_exif(exif):
    """Convert raw EXIF dict to display strings."""
    meta = {}
    
    make = exif.get("Make", "")
    model = exif.get("Model", "")
    if make or model:
        camera = f"{make} {model}".strip()
        meta["camera"] = camera

    lens = exif.get("LensModel", "")
    if lens:
        meta["lens"] = str(lens)

    fnumber = exif.get("FNumber")
    if fnumber is not None:
        try:
            meta["aperture"] = f"f/{float(fnumber):.1f}"
        except Exception:
            pass

    exposure = exif.get("ExposureTime")
    if exposure is not None:
        try:
            val = float(exposure)
            if val < 1:
                meta["shutter"] = f"1/{round(1/val)}s"
            else:
                meta["shutter"] = f"{val:.1f}s"
        except Exception:
            pass

    iso = exif.get("ISOSpeedRatings")
    if iso is not None:
        meta["iso"] = f"ISO {iso}"

    focal = exif.get("FocalLength")
    if focal is not None:
        try:
            meta["focalLength"] = f"{float(focal):.0f}mm"
        except Exception:
            pass

    date_original = exif.get("DateTimeOriginal", "")
    if date_original:
        meta["takenAt"] = str(date_original)

    return meta

def title_from_filename(filename):
    """Derive a readable title from filename."""
    name = os.path.splitext(filename)[0]
    # Remove date prefix like "20250605-"
    name = re.sub(r'^\d{8}-', '', name)
    # Remove "已增强-降噪" suffix
    name = name.replace("已增强-降噪", "").replace("-", " ").strip()
    # Remove DSC prefix
    name = re.sub(r'^DSC\d+', '', name).strip()
    # Capitalize
    if name and name[0].islower():
        name = name[0].upper() + name[1:]
    return name or "Untitled"

def make_id(date_str, location_code, filename):
    name = os.path.splitext(filename)[0]
    safe = re.sub(r'[^a-zA-Z0-9_-]', '', name)
    return f"{date_str}-{location_code}-{safe}".lower()[:64]

def month_from_date(date_str):
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return d.strftime("%Y-%m")

def main():
    os.makedirs(PHOTO_DIR, exist_ok=True)

    entries = []
    copied = []

    for year_dir in sorted(os.listdir(PICTURES_ROOT)):
        year_path = os.path.join(PICTURES_ROOT, year_dir)
        if not os.path.isdir(year_path) or not year_dir.isdigit():
            continue

        for date_dir in sorted(os.listdir(year_path)):
            date_path = os.path.join(year_path, date_dir)
            if not os.path.isdir(date_path) or not re.match(r'\d{4}-\d{2}-\d{2}', date_dir):
                continue

            for loc_dir in sorted(os.listdir(date_path)):
                loc_path = os.path.join(date_path, loc_dir)
                if not os.path.isdir(loc_path):
                    continue
                
                loc_code = loc_dir.lower()
                if loc_code not in LOCATION_MAP:
                    print(f"  SKIP unknown location: {loc_dir} in {date_dir}")
                    continue

                for filename in sorted(os.listdir(loc_path)):
                    if filename == ".DS_Store":
                        continue
                    if not filename.lower().endswith(('.jpg', '.jpeg')):
                        continue

                    src = os.path.join(loc_path, filename)
                    
                    # Generate destination filename: {date}_{loc}_{original}
                    base, ext = os.path.splitext(filename)
                    dest_name = f"{date_dir}_{loc_code}_{base}{ext}"
                    dest = os.path.join(PHOTO_DIR, dest_name)

                    # Skip if already exists and same size
                    if os.path.exists(dest) and os.path.getsize(dest) == os.path.getsize(src):
                        print(f"  SKIP (exists): {dest_name}")
                    else:
                        shutil.copy2(src, dest)
                        copied.append(dest_name)
                        print(f"  COPY {src} -> {dest_name}")

                    # Read EXIF from source
                    exif = get_exif(src)
                    meta = format_exif(exif)

                    title = title_from_filename(filename)
                    loc = LOCATION_MAP[loc_code]
                    entry = {
                        "id": make_id(date_dir, loc_code, filename),
                        "title": title,
                        "image": f"/assets/photo/{dest_name}",
                        "location": dict(loc),
                        "month": month_from_date(date_dir),
                        "date": date_dir,
                        "collection": COLLECTION_MAP.get(loc_code, "未分类"),
                    }
                    if meta:
                        entry["fallbackMeta"] = meta
                    entries.append(entry)

    # Sort by date desc
    entries.sort(key=lambda e: e["date"], reverse=True)

    # Write photo-data.js
    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write("window.LOCATION_CONFIG = {\n")
        f.write('  levels: ["country", "province", "city", "district"],\n')
        f.write("  labels: {\n")
        f.write('    country: "国家",\n')
        f.write('    province: "省份",\n')
        f.write('    city: "城市",\n')
        f.write('    district: "区县"\n')
        f.write("  }\n")
        f.write("};\n\n")

        f.write("window.getPhotoLocation = function (photo) {\n")
        f.write("  if (photo.location) return photo.location;\n")
        f.write("  var loc = {};\n")
        f.write("  if (photo.country) loc.country = photo.country;\n")
        f.write("  if (photo.province) loc.province = photo.province;\n")
        f.write("  if (photo.city) loc.city = photo.city;\n")
        f.write("  if (photo.district) loc.district = photo.district;\n")
        f.write("  return loc;\n")
        f.write("};\n\n")

        f.write("window.getLocationDisplay = function (photo, sep) {\n")
        f.write("  var loc = window.getPhotoLocation(photo);\n")
        f.write("  var levels = window.LOCATION_CONFIG.levels;\n")
        f.write("  var parts = [];\n")
        f.write("  for (var i = 0; i < levels.length; i++) {\n")
        f.write("    var key = levels[i];\n")
        f.write("    if (loc[key]) parts.push(loc[key]);\n")
        f.write("  }\n")
        f.write('  return parts.join(sep || " · ");\n')
        f.write("};\n\n")

        f.write("window.PHOTO_ITEMS = [\n")
        for i, entry in enumerate(entries):
            f.write("  {\n")
            for key in ["id", "title", "image", "month", "date", "collection"]:
                val = entry[key]
                f.write(f'    {key}: "{val}",\n')
            f.write('    location: {\n')
            for lk in ["country", "province", "city", "district"]:
                f.write(f'      {lk}: "{entry["location"][lk]}",\n')
            f.write("    },\n")
            if "fallbackMeta" in entry:
                fm = entry["fallbackMeta"]
                f.write("    fallbackMeta: {\n")
                for mk in ["camera", "lens", "aperture", "shutter", "iso", "focalLength", "takenAt"]:
                    if mk in fm:
                        f.write(f'      {mk}: "{fm[mk]}",\n')
                f.write("    }\n")
            else:
                f.write("    // no fallbackMeta\n")
            comma = "" if i == len(entries) - 1 else ","
            f.write(f"  }}{comma}\n")
        f.write("];\n")

    print(f"\n=== DONE ===")
    print(f"  Copied: {len(copied)} files")
    print(f"  Total entries: {len(entries)}")
    print(f"  Output: {OUTPUT_JS}")

if __name__ == "__main__":
    main()
