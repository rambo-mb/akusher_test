import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { prisma } from "./db.js";
import { registerRoutes } from "./routes.js";
import { seedQuestions } from "./seed.js";
import { createBot, setupMenuButton } from "./bot.js";

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));
  await registerRoutes(app);

  // Savollarni bazaga idempotent yuklash (data/questions.json dan)
  try {
    const n = await seedQuestions(prisma);
    app.log.info(`Savollar yuklandi/yangilandi: ${n} ta`);
  } catch (e) {
    app.log.error(`Seed xatosi: ${e}`);
  }

  // Bot (long-polling — dev va oddiy prod uchun)
  const bot = createBot();
  bot.start({
    onStart: () => app.log.info("Telegram bot ishga tushdi (long-polling)"),
  });
  setupMenuButton(bot).catch((e) => app.log.warn(`Menu button o'rnatilmadi: ${e}`));

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`API tayyor: http://localhost:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
