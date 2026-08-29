import { Bot, InlineKeyboard } from "grammy";
import { env } from "./env.js";

export function createBot() {
  const bot = new Bot(env.BOT_TOKEN);

  bot.command("start", async (ctx) => {
    const kb = new InlineKeyboard().webApp("🩺 Testni boshlash", env.WEB_APP_URL);
    await ctx.reply(
      "Assalomu alaykum! 👩‍⚕️\n\n" +
        "Bu bot Akusherlik va ginekologiya imtihoniga tayyorlanish uchun.\n" +
        "Quyidagi tugma orqali test rejimini oching:",
      { reply_markup: kb },
    );
  });

  bot.command("help", (ctx) =>
    ctx.reply(
      "Rejimlar:\n" +
        "• Random test — tasodifiy savollar\n" +
        "• Imtihon — vaqt chegarasi bilan\n" +
        "• O'rganish — darhol to'g'ri/noto'g'ri\n" +
        "• Xatolar ustida — avval xato qilinganlar\n\n" +
        "/start bosib boshlang.",
    ),
  );

  return bot;
}

/** Menyu tugmasini (chat pastidagi) WebApp'ga ulash */
export async function setupMenuButton(bot: Bot) {
  await bot.api.setChatMenuButton({
    menu_button: { type: "web_app", text: "Test", web_app: { url: env.WEB_APP_URL } },
  });
}
