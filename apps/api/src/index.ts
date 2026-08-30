import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { prisma } from "./db.js";
import { registerRoutes } from "./routes.js";
import { seedQuestions } from "./seed.js";
import { backfillSrs } from "./srs.js";
import { createBot, setupMenuButton } from "./bot.js";
import { startScheduler } from "./scheduler.js";

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  // Bot (long-polling — dev va oddiy prod uchun)
  const bot = createBot();

  app.get("/health", async () => ({ ok: true }));
  await registerRoutes(app, bot);

  // Savollarni bazaga idempotent yuklash (data/questions.json dan)
  try {
    const n = await seedQuestions(prisma);
    app.log.info(`Savollar yuklandi/yangilandi: ${n} ta`);
    const b = await backfillSrs();
    if (b > 0) app.log.info(`SRS holati tiklandi: ${b} yozuv`);
  } catch (e) {
    app.log.error(`Seed/backfill xatosi: ${e}`);
  }

  // Botni chidamli ishga tushirish: 409 (deploy paytida ikki instansiya) yoki
  // vaqtinchalik xatoда API'ni qulatmasdan qayta urinamiz.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  void (async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        await bot.start({
          drop_pending_updates: true,
          onStart: () => app.log.info("Telegram bot ishga tushdi (long-polling)"),
        });
        break; // bot to'xtaganда resolve bo'ladi
      } catch (err) {
        app.log.warn(`Bot polling xatosi (urinish ${attempt}): ${err}. 5s dan keyin qayta.`);
        await sleep(5000);
      }
    }
  })();
  setupMenuButton(bot).catch((e) => app.log.warn(`Menu button o'rnatilmadi: ${e}`));
  startScheduler(bot);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`API tayyor: http://localhost:${env.PORT}`);
}

// So'nggi himoya: kutilmagan xatolar jarayonni qulatmasin (log qilamiz)
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
