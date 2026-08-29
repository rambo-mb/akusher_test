// Railway Infrastructure as Code — Postgres + API + Web (pnpm monorepo)
// Docs: https://docs.railway.com/infrastructure-as-code
//
// ⚠️ "<OWNER>/<REPO>" ni o'zingizning GitHub repo'ngizga almashtiring.
//
// Maxfiy/domenga bog'liq env'lar (bu faylga YOZILMAYDI — Railway dashboard'da qo'ying):
//   API servisi:  BOT_TOKEN, JWT_SECRET, WEB_APP_URL (= web domeni)
//   Web servisi:  VITE_API_URL (= api domeni, build vaqtida kerak)
// DATABASE_URL va build/start bu yerda avtomatik boshqariladi.

import { defineRailway, github, postgres, project, service } from "railway/iac"

const REPO = "rambo-mb/akusher_test";

export default defineRailway(() => {
  const db = postgres("postgres");

  const api = service("api", {
    source: github(REPO),
    build: "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @aku/api build",
    // start:prod -> `prisma db push` (jadvallarni yaratadi) + serverni ishga tushiradi
    start: "pnpm --filter @aku/api start:prod",
    healthcheck: "/health",
    replicas: 1, // bot long-polling — bitta instansiya bo'lishi shart
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
    },
  });

  const web = service("web", {
    source: github(REPO),
    build: "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @aku/web build",
    start: "pnpm --filter @aku/web start",
  });

  return project("aku-test", {
    resources: [api, web, db],
  });
});
