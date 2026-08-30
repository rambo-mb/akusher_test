import cron from "node-cron";
import { prisma } from "./db.js";
import { notifyUser } from "./access.js";
import { Bot, InlineKeyboard } from "grammy";
import { env } from "./env.js";

// Run every day at 19:00 (7 PM)
export function startScheduler(bot: Bot) {
  cron.schedule("0 19 * * *", async () => {
    console.log("[Scheduler] Running daily reminder check...");
    
    // Find users with remindersOn = true, status = approved, and their access is valid
    const now = new Date();
    const users = await prisma.user.findMany({
      where: {
        remindersOn: true,
        status: "approved",
        OR: [
          { accessUntil: null },
          { accessUntil: { gt: now } }
        ]
      }
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const kb = new InlineKeyboard().webApp("🩺 Testni boshlash", env.WEB_APP_URL);

    let sentCount = 0;
    for (const user of users) {
      // Check if they have answered any question today
      const answerToday = await prisma.attemptAnswer.findFirst({
        where: {
          attempt: { userId: user.id },
          answeredAt: { gte: startOfDay }
        }
      });

      if (!answerToday) {
        const msg = `Bugungi mashqni bajaring 🔥 (streak: ${user.streak})\n\nHar kuni mashq qilish orqali natijalaringizni yaxshilang!`;
        await notifyUser(bot, user.telegramId, msg);
        // Basic rate limit (Telegram limit is 30 msgs / second approx)
        await new Promise(r => setTimeout(r, 50));
        sentCount++;
      }
    }
    
    console.log(`[Scheduler] Sent ${sentCount} reminders.`);
  });
}
