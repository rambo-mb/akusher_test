import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "./env.js";
import { prisma } from "./db.js";

export function isAdminTelegramId(telegramId: bigint | number | string): boolean {
  return !!env.ADMIN_TELEGRAM_ID && String(telegramId) === env.ADMIN_TELEGRAM_ID;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

/**
 * Telegram WebApp initData ni tekshiradi (HMAC-SHA256).
 * Hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(initData: string, maxAgeSec = 24 * 60 * 60): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(env.BOT_TOKEN).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // Doimiy vaqtli taqqoslash
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  // auth_date yangiligini tekshirish
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    return JSON.parse(userRaw) as TelegramUser;
  } catch {
    return null;
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ uid: userId }, env.JWT_SECRET, { expiresIn: "30d" });
}

declare module "fastify" {
  interface FastifyRequest {
    userId?: number;
    isAdmin?: boolean;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Avtorizatsiya talab qilinadi" });
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as { uid: number };
    req.userId = payload.uid;
  } catch {
    return reply.code(401).send({ error: "Token yaroqsiz" });
  }
}

/** Tasdiqlangan (yoki admin) foydalanuvchilargagina ruxsat. requireAuth'dan keyin ishlaydi. */
export async function requireApproved(req: FastifyRequest, reply: FastifyReply) {
  if (!req.userId) return reply.code(401).send({ error: "Avtorizatsiya talab qilinadi" });
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return reply.code(401).send({ error: "Foydalanuvchi topilmadi" });
  const admin = isAdminTelegramId(user.telegramId);
  req.isAdmin = admin;
  if (!admin && user.status !== "approved") {
    return reply.code(403).send({ error: "Ruxsat berilmagan", status: user.status });
  }
}

/** Faqat admin. requireAuth'dan keyin ishlaydi. */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.userId) return reply.code(401).send({ error: "Avtorizatsiya talab qilinadi" });
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !isAdminTelegramId(user.telegramId)) {
    return reply.code(403).send({ error: "Faqat admin uchun" });
  }
  req.isAdmin = true;
}
