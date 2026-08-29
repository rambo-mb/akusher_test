import { Bot, InlineKeyboard } from "grammy";
import { env } from "./env.js";
import { prisma } from "./db.js";
import { isAdminTelegramId } from "./auth.js";
import { approvalKeyboard, approveUser, blockUser, notifyAdmin } from "./access.js";

export function createBot() {
  const bot = new Bot(env.BOT_TOKEN);

  // Har kim o'z Telegram ID'sini bilib olishi uchun (admin sozlash uchun kerak)
  bot.command("myid", async (ctx) => {
    await ctx.reply(
      `🆔 Sizning Telegram ID: \`${ctx.from?.id}\`\n\n` +
        "Admin bo'lish uchun ushbu raqamni Railway'da `ADMIN_TELEGRAM_ID` o'zgaruvchisiga qo'ying.",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("start", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const admin = isAdminTelegramId(from.id);
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(from.id) },
      update: {
        firstName: from.first_name,
        username: from.username ?? null,
        ...(admin ? { status: "approved" } : {}),
      },
      create: {
        telegramId: BigInt(from.id),
        firstName: from.first_name,
        username: from.username ?? null,
        status: admin ? "approved" : "pending",
      },
    });

    if (admin || user.status === "approved") {
      const kb = new InlineKeyboard().webApp("🩺 Testni boshlash", env.WEB_APP_URL);
      await ctx.reply(
        `Assalomu alaykum, ${from.first_name}! 👩‍⚕️\n\n` +
          "Akusherlik va ginekologiya imtihoniga tayyorlanish uchun testlar tayyor.\n" +
          "Quyidagi tugma orqali boshlang:",
        { reply_markup: kb },
      );
    } else if (user.status === "blocked") {
      await ctx.reply("⛔ Kechirasiz, sizga ushbu botdan foydalanish ruxsati berilmagan.");
    } else {
      const kb = new InlineKeyboard().text("📩 Ruxsat so'rash", `req:${user.id}`);
      await ctx.reply(
        "🔒 Bu bot yopiq (maxsus ruxsat bilan).\n\n" +
          "Foydalanish uchun admindan ruxsat so'rang — quyidagi tugmani bosing:",
        { reply_markup: kb },
      );
    }
  });

  bot.command("help", (ctx) =>
    ctx.reply(
      "Rejimlar:\n" +
        "• Random test — tasodifiy savollar\n" +
        "• Imtihon — vaqt chegarasi bilan\n" +
        "• O'rganish — darhol to'g'ri/noto'g'ri\n" +
        "• Xatolar ustida — avval xato qilinganlar\n\n" +
        "/start — boshlash · /myid — Telegram ID",
    ),
  );

  // Foydalanuvchi "Ruxsat so'rash" tugmasini bosdi
  bot.callbackQuery(/^req:(\d+)$/, async (ctx) => {
    const userId = Number(ctx.match[1]);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return ctx.answerCallbackQuery("Foydalanuvchi topilmadi");
    if (user.status === "approved" || isAdminTelegramId(user.telegramId)) {
      return ctx.answerCallbackQuery("Sizda allaqachon ruxsat bor ✅");
    }
    if (user.status === "blocked") return ctx.answerCallbackQuery("Siz bloklangansiz");
    const uname = user.username ? `@${user.username}` : "(username yo'q)";
    await notifyAdmin(
      bot,
      `🔔 Yangi ruxsat so'rovi:\n👤 ${user.firstName} ${uname}\n🆔 ${user.telegramId}`,
      approvalKeyboard(user.id),
    );
    await ctx.answerCallbackQuery("So'rovingiz yuborildi ✅");
    await ctx.editMessageText("📩 So'rovingiz adminга yuborildi. Tasdiqlashini kuting.");
  });

  // Admin: tasdiqlash (ap:<kun>:<userId>, 0 = cheksiz)
  bot.callbackQuery(/^ap:(\d+):(\d+)$/, async (ctx) => {
    if (!ctx.from || !isAdminTelegramId(ctx.from.id)) {
      return ctx.answerCallbackQuery("Faqat admin uchun");
    }
    const days = Number(ctx.match[1]);
    const userId = Number(ctx.match[2]);
    const user = await approveUser(bot, userId, days);
    const info = user.accessUntil ? `${user.accessUntil.toISOString().slice(0, 10)} gacha` : "cheksiz";
    await ctx.answerCallbackQuery("Tasdiqlandi ✅");
    await ctx.editMessageText(`✅ Ruxsat berildi: ${user.firstName} (${info})`);
  });

  // Admin: rad etish / bloklash
  bot.callbackQuery(/^reject:(\d+)$/, async (ctx) => {
    if (!ctx.from || !isAdminTelegramId(ctx.from.id)) {
      return ctx.answerCallbackQuery("Faqat admin uchun");
    }
    const userId = Number(ctx.match[1]);
    const user = await blockUser(bot, userId);
    await ctx.answerCallbackQuery("Rad etildi");
    await ctx.editMessageText(`⛔ Rad etildi: ${user.firstName} (ID ${user.telegramId})`);
  });

  bot.catch((err) => console.error("Bot xatosi:", err));
  return bot;
}

/** Menyu tugmasini (chat pastidagi) WebApp'ga ulash */
export async function setupMenuButton(bot: Bot) {
  await bot.api.setChatMenuButton({
    menu_button: { type: "web_app", text: "Test", web_app: { url: env.WEB_APP_URL } },
  });
}
