import type { Bot } from "grammy";
import { env } from "./env.js";
import { prisma } from "./db.js";

/** Foydalanuvchiga xabar yuborish (xatoni yutamiz — bot bloklangan bo'lishi mumkin) */
export async function notifyUser(bot: Bot, telegramId: bigint | number, text: string) {
  try {
    await bot.api.sendMessage(Number(telegramId), text);
  } catch {
    /* foydalanuvchi botni bloklagan bo'lishi mumkin */
  }
}

/** Adminга xabar (ixtiyoriy inline klaviatura bilan) */
export async function notifyAdmin(bot: Bot, text: string, replyMarkup?: unknown) {
  if (!env.ADMIN_TELEGRAM_ID) return;
  try {
    await bot.api.sendMessage(Number(env.ADMIN_TELEGRAM_ID), text, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reply_markup: replyMarkup as any,
    });
  } catch {
    /* admin botni ochmagan bo'lishi mumkin */
  }
}

export async function approveUser(bot: Bot, userId: number) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "approved" },
  });
  await notifyUser(
    bot,
    user.telegramId,
    "✅ Sizga ruxsat berildi! Endi testlardan foydalanishingiz mumkin. /start bosing.",
  );
  return user;
}

export async function blockUser(bot: Bot, userId: number) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "blocked" },
  });
  await notifyUser(bot, user.telegramId, "⛔ Sizning ruxsatingiz bekor qilindi.");
  return user;
}
