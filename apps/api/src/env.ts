import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Muhit o'zgaruvchisi topilmadi: ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  BOT_TOKEN: required("BOT_TOKEN"),
  JWT_SECRET: required("JWT_SECRET"),
  WEB_APP_URL: required("WEB_APP_URL"),
  PORT: Number(process.env.PORT ?? 3000),
  // Bo'sh bo'lsa bot long-polling'da ishlaydi (dev). To'ldirilsa webhook (prod).
  PUBLIC_API_URL: process.env.PUBLIC_API_URL ?? "",
  // Admin (bot egasi) Telegram raqamli ID'si. /myid orqali bilib olinadi.
  ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID ?? "",
  ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? "",
  PRICE_INFO: process.env.PRICE_INFO ?? "",
};
