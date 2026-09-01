"""
Gemini bilan questions.json ni rus tiliga tarjima qilish.
Foydalanish:
  pip install google-genai
  GEMINI_API_KEY=<kalit> python data/translate_ru.py

Resume-safe: har batch dan keyin questions.json ga yozadi.
Allaqachon stem_ru mavjud bo'lgan savollarni o'tkazib yuboradi.
"""

import json, os, time, sys, re, io

# Windows stdout UTF-8
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

try:
    from google import genai
except ImportError:
    sys.exit("Avval: pip install google-genai")

API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not API_KEY:
    sys.exit("GEMINI_API_KEY muhit o'zgaruvchisi kerak")

QUESTIONS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "questions.json")
BATCH_SIZE = 25   # kuniga 20 so'rov: 25×20=500 savol/kun
SLEEP_SEC  = 6
MAX_RETRY  = 3

# Mavjud modellarni sinab ko'ramiz
CANDIDATE_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
]

client = genai.Client(api_key=API_KEY)

SYSTEM_PROMPT = (
    "Siz tibbiy tarjimon bo'lib, o'zbek tilidan rus tiliga tarjima qilasiz.\n"
    "Qoidalar:\n"
    "- Faqat tibbiy/ilmiy terminologiya bo'yicha aniq, professional tarjima qiling.\n"
    "- Raqamlar, birliklar, ICD kodlari (Z32.1 kabi), lotincha nomlar O'ZGARMAYDI.\n"
    "- Variantlar soni albatta AYNAN asl sondek bo'lishi kerak.\n"
    "- Faqat JSON massivini qaytaring — boshqa hech narsa yo'q.\n"
)


def detect_model():
    """Mavjud Gemini modelini topadi."""
    test_prompt = "Say 'ok'"
    for m in CANDIDATE_MODELS:
        try:
            resp = client.models.generate_content(model=m, contents=test_prompt)
            if resp.text:
                print(f"Model: {m}")
                return m
        except Exception:
            pass
    # Fallback: API dan modellar ro'yxatini olish
    try:
        models = list(client.models.list())
        for m in models:
            name = m.name.replace("models/", "")
            if "flash" in name.lower():
                print(f"Model (fallback): {name}")
                return name
    except Exception:
        pass
    sys.exit("Hech qanday Gemini model topilmadi. Kalit yoki tarmoqni tekshiring.")


def load_questions():
    with open(QUESTIONS_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_questions(data):
    with open(QUESTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def build_prompt(batch):
    items = []
    for q in batch:
        items.append({
            "id": q["id"],
            "stem": q["stem"],
            "options": q["options"],
            "explanation": q.get("explanation") or "",
        })
    return (
        SYSTEM_PROMPT
        + "\nQuyidagi JSON massividagi har bir savolni rus tiliga tarjima qiling.\n"
        "Faqat quyidagi formatda JSON massivini qaytaring:\n"
        '[{"id":1,"stem_ru":"...","options_ru":["...","..."],"explanation_ru":"..."},...]\n\n'
        "Tarjima qilinadigan savollar:\n"
        + json.dumps(items, ensure_ascii=False)
    )


def parse_response(text):
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    text = re.sub(r"```\s*$", "", text).strip()
    start = text.find("[")
    end   = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("JSON massivi topilmadi")
    return json.loads(text[start:end+1])


DAILY_QUOTA_EXHAUSTED = False

def translate_batch(batch, model):
    global DAILY_QUOTA_EXHAUSTED
    prompt = build_prompt(batch)
    for attempt in range(1, MAX_RETRY + 1):
        try:
            resp = client.models.generate_content(model=model, contents=prompt)
            result = parse_response(resp.text)
            return {item["id"]: item for item in result}
        except Exception as e:
            err = str(e)
            print(f"  Urinish {attempt}/{MAX_RETRY} xato: {e}")
            # Kunlik limit to'ldi — ortiqcha urinishning foydasi yo'q
            if "PerDay" in err or "per_day" in err.lower() or "GenerateRequestsPerDay" in err:
                DAILY_QUOTA_EXHAUSTED = True
                return {}
            if attempt < MAX_RETRY:
                time.sleep(SLEEP_SEC * attempt * 2)
    return {}


def verify(data):
    errors = []
    for q in data:
        if not q.get("stem_ru"):
            continue
        if len(q.get("options", [])) != len(q.get("options_ru", [])):
            errors.append(f"  ID {q['id']}: options={len(q['options'])}, options_ru={len(q.get('options_ru',[]))}")
    return errors


def main():
    print("Model aniqlanmoqda...", flush=True)
    model = detect_model()

    data = load_questions()
    total = len(data)
    pending = [q for q in data if not q.get("stem_ru")]
    print(f"Jami savollar: {total}")
    print(f"Tarjima kutmoqda: {len(pending)}")
    print(f"Allaqachon tarjima qilingan: {total - len(pending)}")

    if not pending:
        print("Hammasi tarjima qilingan!")
        errors = verify(data)
        if errors:
            print(f"\nVariantlar soni mos kelmagan ({len(errors)} ta):")
            for e in errors: print(e)
        return

    idx = {q["id"]: i for i, q in enumerate(data)}
    batches = [pending[i:i+BATCH_SIZE] for i in range(0, len(pending), BATCH_SIZE)]
    print(f"\nBatchlar: {len(batches)} x ~{BATCH_SIZE} savol\n", flush=True)

    for bi, batch in enumerate(batches, 1):
        ids = [q["id"] for q in batch]
        print(f"Batch {bi}/{len(batches)}: ID {ids[0]}..{ids[-1]}  ", end="", flush=True)
        translations = translate_batch(batch, model)

        if DAILY_QUOTA_EXHAUSTED:
            print("KUNLIK LIMIT TO'LDI. Ertaga qayta ishga tushiring.", flush=True)
            break

        updated = 0
        for q in batch:
            tr = translations.get(q["id"])
            if not tr:
                print(f"\n  [!] ID {q['id']} tarjimada yoq")
                continue
            i = idx[q["id"]]
            data[i]["stem_ru"]        = tr.get("stem_ru", "")
            data[i]["options_ru"]     = tr.get("options_ru", [])
            data[i]["explanation_ru"] = tr.get("explanation_ru") or None
            updated += 1

        save_questions(data)
        print(f"OK {updated}/{len(batch)}", flush=True)

        if bi < len(batches):
            time.sleep(SLEEP_SEC)

    print("\nTarjima tugadi!")
    errors = verify(data)
    if errors:
        print(f"\n[!] {len(errors)} ta savolda options soni mos kelmadi:")
        for e in errors: print(e)
    else:
        print("Barcha variantlar soni togri.")


if __name__ == "__main__":
    main()
