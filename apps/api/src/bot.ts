import { Bot, InlineKeyboard } from "grammy";
import { env } from "./env.js";
import { prisma } from "./db.js";
import { effectiveStatus, isAdminTelegramId } from "./auth.js";
import { approvalKeyboard, approveUser, declineUser, notifyAdmin } from "./access.js";

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
    
    let refId: number | undefined;
    if (typeof ctx.match === "string" && ctx.match.startsWith("ref_")) {
      const parsed = parseInt(ctx.match.replace("ref_", ""), 10);
      if (!isNaN(parsed)) refId = parsed;
    }

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
        referredById: refId,
      },
    });

    const eff = effectiveStatus(user);
    if (admin || eff === "approved") {
      const kb = new InlineKeyboard().webApp("🩺 Testni boshlash", env.WEB_APP_URL);
      await ctx.reply(
        `Assalomu alaykum, ${from.first_name}! 👩‍⚕️\n\n` +
          "Akusherlik va ginekologiya imtihoniga tayyorlanish uchun testlar tayyor.\n" +
          "Quyidagi tugma orqali boshlang:",
        { reply_markup: kb },
      );
    } else if (eff === "blocked") {
      await ctx.reply("⛔ Kechirasiz, sizga ushbu botdan foydalanish ruxsati berilmagan.");
    } else {
      // pending yoki expired
      const expired = eff === "expired";
      let msg = expired
        ? "⏰ Obunangiz tugadi.\n\nDavom etish uchun obunani yangilang — admin bilan bog'laning."
        : "🔒 Xush kelibsiz!\n\n🎁 Bir marta testni BEPUL sinab ko'rishingiz mumkin. Keyin davom etish uchun admindan ruxsat oling (to'lov).";
      const kb = new InlineKeyboard();
      if (!expired && !user.trialUsed) {
        kb.webApp("🎁 Bepul test ishlash", env.WEB_APP_URL).row();
      }
      kb.text(expired ? "♻️ Yangilash so'rash" : "📩 Ruxsat so'rash", `req:${user.id}`);
      if (env.PRICE_INFO) msg += `\n\n${env.PRICE_INFO}`;
      if (env.ADMIN_USERNAME) {
        kb.row().url("💬 Admin bilan bog'lanish", `https://t.me/${env.ADMIN_USERNAME}`);
      }
      await ctx.reply(msg, { reply_markup: kb });
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
      `🔔 Yangi ruxsat so'rovi:\n👤 ${user.firstName} ${uname}\n🆔 ${user.telegramId}\n\n✍️ Javob berish uchun shu xabarga reply qiling.`,
      approvalKeyboard(user.id),
    );
    await ctx.answerCallbackQuery("So'rovingiz yuborildi ✅");
    let msg = "📩 So'rovingiz adminга yuborildi. Tasdiqlashini kuting.";
    const editKb = new InlineKeyboard();
    if (env.PRICE_INFO) {
      msg += `\n\n${env.PRICE_INFO}`;
    }
    if (env.ADMIN_USERNAME) {
      editKb.url("💬 Admin bilan bog'lanish", `https://t.me/${env.ADMIN_USERNAME}`);
    }
    await ctx.editMessageText(msg, { reply_markup: editKb.inline_keyboard.length ? editKb : undefined });
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

  // Admin: yumshoq rad etish (bloklamaydi — foydalanuvchi qayta so'ray oladi)
  bot.callbackQuery(/^reject:(\d+)$/, async (ctx) => {
    if (!ctx.from || !isAdminTelegramId(ctx.from.id)) {
      return ctx.answerCallbackQuery("Faqat admin uchun");
    }
    const userId = Number(ctx.match[1]);
    const user = await declineUser(bot, userId);
    await ctx.answerCallbackQuery("Rad etildi");
    await ctx.editMessageText(
      `❌ Rad etildi: ${user?.firstName ?? userId}. (Foydalanuvchi to'lovдан keyin qayta so'ray oladi)`,
    );
  });

  bot.on("message:photo", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(from.id) } });
    if (!user) return;
    
    // Admin o'zi yuborsa e'tibor bermaymiz
    if (isAdminTelegramId(from.id)) return;

    // Adminga rasm (chek) va ma'lumotlarni forward qilamiz
    await notifyAdmin(
      bot,
      `🧾 Yangi to'lov cheki:\n👤 ${user.firstName} ${user.username ? `(@${user.username})` : ""}\n🆔 ${user.telegramId}\n\n✍️ Javob berish uchun shu xabarga reply qiling.`,
      approvalKeyboard(user.id)
    );
    await ctx.forwardMessage(env.ADMIN_TELEGRAM_ID);

    await ctx.reply("Chek qabul qilindi, admin tasdiqlashini kuting.");
  });

  // Chat-relay: admin so'rov/xabarga "reply" qilса -> foydalanuvchiga yetkaziladi;
  // oddiy foydalanuvchi yozsa -> adminга yetkaziladi (ikki tomonlama muloqot).
  bot.on("message:text", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const text = ctx.message.text;
    if (text.startsWith("/")) return; // komandalar alohida

    if (isAdminTelegramId(from.id)) {
      // Admin javobi: 🆔 <id> bo'lgan xabarga reply qilingan bo'lishi kerak
      const replied = ctx.message.reply_to_message;
      const rtext =
        (replied && ("text" in replied ? replied.text : undefined)) ??
        (replied && ("caption" in replied ? replied.caption : undefined)) ??
        "";
      const m = rtext.match(/🆔\s*(\d+)/);
      if (!m) {
        await ctx.reply("ℹ️ Foydalanuvchiga yozish uchun uning xabariga *reply* qilib yozing.", {
          parse_mode: "Markdown",
        });
        return;
      }
      try {
        await bot.api.sendMessage(Number(m[1]), `💬 Admin:\n${text}`);
        await ctx.reply("✅ Foydalanuvchiga yuborildi.");
      } catch {
        await ctx.reply("❌ Yuborib bo'lmadi (foydalanuvchi botni bloklagan bo'lishi mumkin).");
      }
      return;
    }

    // Oddiy foydalanuvchi -> adminга (admin reply qilib javob bera oladi)
    const uname = from.username ? `@${from.username}` : "(username yo'q)";
    await notifyAdmin(
      bot,
      `✉️ Xabar:\n👤 ${from.first_name} ${uname}\n🆔 ${from.id}\n\n${text}\n\n✍️ Javob berish uchun shu xabarga reply qiling.`,
    );
    await ctx.reply("✅ Xabaringiz adminга yuborildi. Tez orada javob olasiz.");
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
