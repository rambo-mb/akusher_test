# Akusherlik va ginekologiya — Telegram Mini App (test)

`docs/test.docx` dagi ~625 ta savoldan tasodifiy tanlab, imtihonga tayyorlanish uchun
interaktiv test o'tkazadigan **Telegram Mini App**. Bot + WebApp + backend (progress,
statistika, reyting bilan).

## Texnologiyalar
- **Frontend:** React + Vite (TypeScript) — `apps/web`
- **Backend:** Fastify + Prisma (TypeScript) — `apps/api`
- **Bot:** grammY
- **DB:** PostgreSQL
- **Data pipeline:** Python (`data/parse_docx.py`) — docx → `questions.json`

## Test rejimlari
1. **Random** — tasodifiy N ta savol
2. **Imtihon** — vaqt chegarasi bilan (savoliga ~50 s)
3. **O'rganish** — har javobdan keyin darhol to'g'ri/noto'g'ri
4. **Xatolar ustida** — avval xato qilingan (va hali to'g'ri javob berilmagan) savollar

---

## 1. Ma'lumotni tayyorlash (bir marta)

```bash
pip install python-docx
python data/parse_docx.py
```

Chiqadi:
- `data/questions.json` — yakuniy dataset (seed manbai)
- `data/review_needed.json` — qo'lda tekshirish kerak bo'lgan bloklar (xom matn bilan)
- `data/questions.raw.json` — barcha bloklar (ishonch belgisi bilan)

**Toza format (docx shu ko'rinishда bo'lishi kerak):**
```
N. Savol matni (bitta qatorda)
Variant 1
Variant 2 (BOLD = to'g'ri javob)
Variant 3
Variant 4
```
Har savol `N. ` bilan (raqam+nuqta), har variant alohida qatorda, to'g'ri javob to'liq bold.

**Ishlash mantig'i:** parser faqat **toza** (aynan 4 variant + 1 to'liq-bold + qisman bold yo'q)
bloklarni `needsReview=false` deb belgilaydi. Test bazasiga (seed) va tasodifiy tanlovga
**faqat shu toza savollar** tushadi. docx'da yana savollar to'g'rilangач, parserни qayta
yurgazib (`python data/parse_docx.py`) va qayta seed qilib bazани kengaytirasiz — kod
o'zgarmaydi. Tekshirilmagan bloklar `review_needed.json` da xom matni bilan qoladi.

---

## 2. Lokal ishga tushirish

Talablar: Node 20+, Docker (Postgres uchun), pnpm (`npx pnpm@9 ...` yoki `corepack`).

```bash
# 1) Bog'liqliklar
pnpm install

# 2) .env tayyorlang
cp .env.example .env
#   BOT_TOKEN (BotFather), JWT_SECRET, WEB_APP_URL ni to'ldiring

# 3) Postgres
pnpm db:up               # docker compose up -d db

# 4) Jadvallarni yaratish (db push) + seed
pnpm db:push             # schema -> DB jadvallari
pnpm seed                # toza savollarni yuklaydi

# 5) Backend + Frontend
pnpm dev:api             # http://localhost:3000
pnpm dev:web             # http://localhost:5173
```

### Telegramda sinash
Mini App HTTPS talab qiladi. Lokal frontendni tunnel orqali oching:

```bash
npx cloudflared tunnel --url http://localhost:5173   # yoki: ngrok http 5173
```

- Chiqqan HTTPS URL ni `.env` dagi `WEB_APP_URL` ga qo'ying (bot tugmasi shuni ochadi).
- API ni ham tunnel qiling va frontend `.env` da `VITE_API_URL` ni o'sha manzilga sozlang.
- Botni qayta ishga tushiring, Telegramda `/start` bosing → **Testni boshlash**.

> Brauzerda (Telegramsiz) sinash uchun `apps/web/.env.local` ga haqiqiy `VITE_DEV_INIT_DATA`
> (BotFather bilan imzolangan initData) qo'yishingiz mumkin; aks holda auth rad etadi.

---

## 3. Railway'ga deploy

Repo'da tayyor config: `railway.api.json` va `railway.web.json` (build/start buyruqlari).

**0.** Kodни GitHub repo'ga push qiling. Railway'da **New Project → Deploy from GitHub repo**.

**1. PostgreSQL:** `+ New → Database → PostgreSQL`. `DATABASE_URL` avtomatik yaratiladi.

**2. API servisi:** `+ New → GitHub Repo` (o'sha repo).
   - Settings → **Config-as-code path**: `railway.api.json`
   - Variables:
     - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Postgres servisiga reference)
     - `BOT_TOKEN` = BotFather tokeningiz
     - `JWT_SECRET` = uzun tasodifiy satr
     - `WEB_APP_URL` = `https://example.com` (vaqtincha — web tayyor bo'lgach yangilaymiz)
   - Settings → **Networking → Generate Domain** → API URL'ni oling (masalan `https://api-xxx.up.railway.app`).

**3. Web servisi:** yana `+ New → GitHub Repo` (o'sha repo).
   - Settings → **Config-as-code path**: `railway.web.json`
   - Variables: `VITE_API_URL` = 2-qadamdagi **API URL** (build vaqtida ishlatiladi)
   - Networking → **Generate Domain** → Web URL'ni oling (masalan `https://web-xxx.up.railway.app`).

**4. API'ni yangilang:** API servisiga qayting → `WEB_APP_URL` = 3-qadamdagi **Web URL** → API qayta deploy bo'ladi (bot tugmasi endi to'g'ri web'ni ochadi).

**5. Bazani to'ldiring (bir marta):** API servisi → **Shell** (yoki `railway run`):
   ```
   pnpm --filter @aku/api seed
   ```
   `db push` (jadvallarni yaratish) har startда avtomatik ishlaydi; `seed` esa qo'lda (u eski javoblarni tozalab qayta yozadi).

**6. BotFather:** bot ishga tushganда menyu tugmasini avtomatik `WEB_APP_URL`ga o'rnatadi.
   Xohlasangiz `/setmenubutton` bilan ham qo'lda sozlash mumkin.

> **Eslatma:** Bot **long-polling**da (webhook shart emas) — API servisi **1 replika**da
> ishlashi kerak (bir nechta replika bo'lsa polling to'qnashadi). `railway.api.json` da
> `numReplicas: 1` qo'yilgan.
>
> **Tartib muhim:** avval API (WEB_APP_URL vaqtinchalik) → web → keyin WEB_APP_URL ni yangilash.
> Aks holda API ishga tushmaydi (WEB_APP_URL majburiy).

---

## Loyiha tuzilishi

```
data/parse_docx.py        docx -> questions.json (+ review fayllar)
data/questions.json       yakuniy savollar bazasi
packages/shared           umumiy TS tiplar (Question, QuizMode, DTO)
apps/api                  Fastify + Prisma + grammY bot
  prisma/schema.prisma    Question / User / Attempt / AttemptAnswer
  prisma/seed.ts          questions.json -> DB
  src/auth.ts             Telegram initData tekshiruvi + JWT
  src/routes.ts           /api/auth, /api/quiz/*, /api/stats, /api/leaderboard
  src/bot.ts              /start + WebApp tugmasi
apps/web                  React Mini App (Home/Quiz/Result/Stats/Leaderboard)
```
