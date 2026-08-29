#!/usr/bin/env python3
"""
docs/test.docx -> data/questions.json (+ review_needed.json, questions.raw.json)

TOZA FORMAT (foydalanuvchi docx'ni shu ko'rinishga keltiradi):
  N. Savol matni (bitta qatorda)
  Variant 1 (alohida qatorda)
  Variant 2 (BOLD = to'g'ri javob)
  Variant 3
  Variant 4

Qoidalar:
  - Har savol yangi qatordan "N. " bilan (raqam+nuqta), raqamdan keyin darrov raqam kelsa
    (masalan 35.5, 1.0) — bu savol emas, variant deb qaraladi.
  - 1-paragraf = savol (stem). Keyingi har bir paragraf = bitta variant.
  - Butunlay bold paragraf = to'g'ri javob. Blokda roppa-rosa 1 ta bold bo'lishi kerak.
  - Toza blok: >=2 variant, roppa-rosa 1 ta to'liq-bold variant, qisman bold yo'q.
    Aks holda blok "needsReview" deb belgilanadi va review_needed.json ga chiqariladi.
  - review_fixes.json (ixtiyoriy): savol raqami bo'yicha avtomatik natijadan ustun qo'yiladi.

Faqat toza (needsReview=false) savollar test bazasiga tushadi (seed va quiz so'rovi filtrlaydi).
"""
import json
import os
import re
import sys

try:
    import docx
except ImportError:
    sys.exit("python-docx kerak: pip install python-docx")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DOCX_PATH = os.path.join(ROOT, "docs", "test.docx")
TOPIC = "Akusherlik va ginekologiya"

# Raqam + nuqta/qavs, lekin keyingi belgi raqam BO'LMASA (o'nlik sonli variantlarni himoya qiladi)
NUM_RE = re.compile(r"^\s*(\d+)[.)](?!\d)\s*")


def is_bold_paragraph(paragraph):
    """Paragrafdagi barcha bo'sh bo'lmagan run'lar bold bo'lsa True."""
    runs = [r for r in paragraph.runs if r.text.strip()]
    return bool(runs) and all(r.bold for r in runs)


def is_partial_bold(paragraph):
    """Ba'zi run'lar bold, ba'zilari yo'q (chala formatlash)."""
    runs = [r for r in paragraph.runs if r.text.strip()]
    if not runs:
        return False
    b = [bool(r.bold) for r in runs]
    return any(b) and not all(b)


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def split_into_blocks(paragraphs):
    blocks = []
    current = None
    for p in paragraphs:
        if not p.text.strip():
            continue
        if NUM_RE.match(p.text):
            if current:
                blocks.append(current)
            current = [p]
        elif current is not None:
            current.append(p)
    if current:
        blocks.append(current)
    return blocks


def parse_block(block):
    """Blok -> {number, stem, options, correctIndex, confidence, reasons}."""
    number = int(NUM_RE.match(block[0].text).group(1))
    stem = clean(NUM_RE.sub("", block[0].text, count=1))

    options = []
    correct_index = -1
    partial = 0
    for p in block[1:]:
        text = clean(p.text)
        if not text:
            continue
        if is_partial_bold(p):
            partial += 1
        if is_bold_paragraph(p):
            if correct_index == -1:
                correct_index = len(options)
            else:
                # bir nechta bold variant -> keyin reasons'da belgilanadi
                pass
        options.append(text)

    bold_count = sum(1 for p in block[1:] if p.text.strip() and is_bold_paragraph(p))

    reasons = []
    if not stem:
        reasons.append("stem yo'q")
    if len(options) != 4:
        reasons.append(f"{len(options)} ta variant (4 kerak)")
    if bold_count == 0:
        reasons.append("bold (to'g'ri javob) yo'q")
    elif bold_count > 1:
        reasons.append(f"{bold_count} ta bold variant")
    if partial:
        reasons.append(f"{partial} ta qisman bold variant")

    confidence = "high" if not reasons else "low"
    return {
        "number": number,
        "topic": TOPIC,
        "stem": stem,
        "options": options,
        "correctIndex": correct_index,
        "confidence": confidence,
        "reasons": reasons,
    }


def raw_block_dump(block):
    lines = []
    for p in block:
        tag = "B" if is_bold_paragraph(p) else (" ~" if is_partial_bold(p) else "  ")
        lines.append(f"[{tag}] {p.text}")
    return "\n".join(lines)


def main():
    if not os.path.exists(DOCX_PATH):
        sys.exit(f"Topilmadi: {DOCX_PATH}")
    document = docx.Document(DOCX_PATH)
    blocks = split_into_blocks(document.paragraphs)

    parsed = []
    review = []
    for block in blocks:
        q = parse_block(block)
        if not q["stem"] and not q["options"]:
            continue
        if q["confidence"] == "low":
            review.append({
                "number": q["number"],
                "reasons": q["reasons"],
                "auto": {"stem": q["stem"], "options": q["options"],
                         "correctIndex": q["correctIndex"]},
                "raw": raw_block_dump(block),
            })
        parsed.append(q)

    # Qo'lda tuzatishlar (ixtiyoriy) — savol raqami bo'yicha ustun
    fixes_path = os.path.join(HERE, "review_fixes.json")
    fixes = {}
    if os.path.exists(fixes_path):
        with open(fixes_path, encoding="utf-8") as f:
            for item in json.load(f):
                fixes[item["number"]] = item

    final = []
    for i, q in enumerate(parsed, start=1):
        if q["number"] in fixes:
            q = {**q, **fixes[q["number"]], "confidence": "fixed", "reasons": []}
        final.append({
            "id": i,
            "number": q["number"],
            "topic": q.get("topic", TOPIC),
            "stem": q["stem"],
            "options": q["options"],
            "correctIndex": q["correctIndex"],
            "needsReview": q["confidence"] == "low",
        })

    with open(os.path.join(HERE, "questions.raw.json"), "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)
    with open(os.path.join(HERE, "review_needed.json"), "w", encoding="utf-8") as f:
        json.dump(review, f, ensure_ascii=False, indent=2)
    with open(os.path.join(HERE, "questions.json"), "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    total = len(final)
    review_cnt = sum(1 for q in final if q["needsReview"])
    clean_cnt = total - review_cnt
    print(f"Jami blok:          {total}")
    print(f"Toza (bazaga tushadi): {clean_cnt}")
    print(f"Review kerak:       {review_cnt}")
    print(f"Qo'lda tuzatilgan:  {len(fixes)}")
    print("-> data/questions.json, review_needed.json, questions.raw.json")


if __name__ == "__main__":
    main()
