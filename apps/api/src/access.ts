import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { env } from "./env.js";
import { prisma } from "./db.js";

/** Admin bildirishnomasi uchun tasdiqlash klaviaturasi (muddat tanlash) */
export function approvalKeyboard(userId: number) {
  return new InlineKeyboard()
    .text("30 kun", `ap:30:${userId}`)
    .text("90 kun", `ap:90:${userId}`)
    .row()
    .text("1 yil", `ap:365:${userId}`)
    .text("♾ Cheksiz", `ap:0:${userId}`)
    .row()
    .text("⛔ Rad etish", `reject:${userId}`);
}

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

const DAY_MS = 86_400_000;

/**
 * Foydalanuvchini tasdiqlaydi / obunani uzaytiradi.
 * days > 0 -> mavjud (kelajakdagi) muddat ustiga qo'shadi; days = 0/undefined -> cheksiz.
 */
export async function approveUser(bot: Bot, userId: number, days?: number) {
  const current = await prisma.user.findUnique({ where: { id: userId } });
  const now = new Date();
  let accessUntil: Date | null = null;
  if (days && days > 0) {
    const base =
      current?.accessUntil && current.accessUntil > now ? current.accessUntil : now;
    accessUntil = new Date(base.getTime() + days * DAY_MS);
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "approved", accessUntil },
  });
  const until = accessUntil
    ? `📅 Amal qiladi: ${accessUntil.toISOString().slice(0, 10)} gacha`
    : "♾ Muddatsiz";
  await notifyUser(
    bot,
    user.telegramId,
    `✅ Sizga ruxsat berildi!\n${until}\n\nTestlarni boshlash uchun /start bosing.`,
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
