import type { Lang } from "@aku/shared";

// Bot foydalanuvchiga yuboradigan matnlar (uz + ru). Admin uchun matnlar tarjima qilinmaydi.
type Entry = { uz: string; ru: string };
type Vars = Record<string, string | number>;

const DICT: Record<string, Entry> = {
  "start.greeting": {
    uz:
      "Assalomu alaykum, {name}! 👩‍⚕️\n\n" +
      "Akusherlik va ginekologiya imtihoniga tayyorlanish uchun testlar tayyor.\n" +
      "Quyidagi tugma orqali boshlang:",
    ru:
      "Здравствуйте, {name}! 👩‍⚕️\n\n" +
      "Тесты для подготовки к экзамену по акушерству и гинекологии готовы.\n" +
      "Начните с помощью кнопки ниже:",
  },
  "btn.startTest": { uz: "🩺 Testni boshlash", ru: "🩺 Начать тест" },
  "btn.freeTest": { uz: "🎁 Bepul test ishlash", ru: "🎁 Пройти бесплатный тест" },
  "btn.reqAccess": { uz: "📩 Ruxsat so'rash", ru: "📩 Запросить доступ" },
  "btn.reqRenew": { uz: "♻️ Yangilash so'rash", ru: "♻️ Запросить продление" },
  "btn.contactAdmin": { uz: "💬 Admin bilan bog'lanish", ru: "💬 Связаться с администратором" },

  "start.blocked": {
    uz: "⛔ Kechirasiz, sizga ushbu botdan foydalanish ruxsati berilmagan.",
    ru: "⛔ Извините, у вас нет доступа к этому боту.",
  },
  "start.expired": {
    uz: "⏰ Obunangiz tugadi.\n\nDavom etish uchun obunani yangilang — admin bilan bog'laning.",
    ru: "⏰ Ваша подписка истекла.\n\nЧтобы продолжить, продлите подписку — свяжитесь с администратором.",
  },
  "start.pending": {
    uz:
      "🔒 Xush kelibsiz!\n\n🎁 Bir marta testni BEPUL sinab ko'rishingiz mumkin. " +
      "Keyin davom etish uchun admindan ruxsat oling (to'lov).",
    ru:
      "🔒 Добро пожаловать!\n\n🎁 Вы можете один раз пройти тест БЕСПЛАТНО. " +
      "Затем для продолжения получите доступ у администратора (оплата).",
  },

  help: {
    uz:
      "Rejimlar:\n" +
      "• Random test — tasodifiy savollar\n" +
      "• Imtihon — vaqt chegarasi bilan\n" +
      "• O'rganish — darhol to'g'ri/noto'g'ri\n" +
      "• Xatolar ustida — avval xato qilinganlar\n\n" +
      "/start — boshlash · /myid — Telegram ID",
    ru:
      "Режимы:\n" +
      "• Случайный тест — случайные вопросы\n" +
      "• Экзамен — с ограничением по времени\n" +
      "• Обучение — сразу верно/неверно\n" +
      "• Работа над ошибками — сначала ошибки\n\n" +
      "/start — начать · /myid — Telegram ID",
  },

  "cb.alreadyApproved": { uz: "Sizda allaqachon ruxsat bor ✅", ru: "У вас уже есть доступ ✅" },
  "cb.blocked": { uz: "Siz bloklangansiz", ru: "Вы заблокированы" },
  "cb.reqSent": { uz: "So'rovingiz yuborildi ✅", ru: "Ваш запрос отправлен ✅" },
  "req.editWait": {
    uz: "📩 So'rovingiz adminga yuborildi. Tasdiqlashini kuting.",
    ru: "📩 Ваш запрос отправлен администратору. Ожидайте подтверждения.",
  },
  "receipt.accepted": {
    uz: "Chek qabul qilindi, admin tasdiqlashini kuting.",
    ru: "Чек принят, ожидайте подтверждения администратора.",
  },
  "relay.userAck": {
    uz: "✅ Xabaringiz adminga yuborildi. Tez orada javob olasiz.",
    ru: "✅ Ваше сообщение отправлено администратору. Скоро получите ответ.",
  },
  "relay.adminPrefix": { uz: "💬 Admin:\n", ru: "💬 Администратор:\n" },

  "approve.granted": {
    uz: "✅ Sizga ruxsat berildi!\n{until}\n\nTestlarni boshlash uchun /start bosing.",
    ru: "✅ Вам предоставлен доступ!\n{until}\n\nНажмите /start, чтобы начать тесты.",
  },
  "until.date": { uz: "📅 Amal qiladi: {date} gacha", ru: "📅 Действует до: {date}" },
  "until.forever": { uz: "♾ Muddatsiz", ru: "♾ Бессрочно" },
  "referral.bonus": {
    uz:
      "🎁 Tabriklaymiz! Siz taklif qilgan do'stingiz obuna xarid qildi.\n\n" +
      "Sizga +7 kun bonus taqdim etildi. (Gacha: {date})",
    ru:
      "🎁 Поздравляем! Приглашённый вами друг оформил подписку.\n\n" +
      "Вам начислен бонус +7 дней. (До: {date})",
  },
  decline: {
    uz:
      "❌ So'rovingiz hozircha tasdiqlanmadi.\n\n" +
      "To'lovni amalga oshirib, admin bilan bog'laning va qayta urinib ko'ring.",
    ru:
      "❌ Ваш запрос пока не подтверждён.\n\n" +
      "Оплатите и свяжитесь с администратором, затем попробуйте снова.",
  },
  block: { uz: "⛔ Sizning ruxsatingiz bekor qilindi.", ru: "⛔ Ваш доступ отозван." },
  reminder: {
    uz: "Bugungi mashqni bajaring 🔥 (streak: {streak})\n\nHar kuni mashq qilish orqali natijalaringizni yaxshilang!",
    ru: "Выполните сегодняшнюю практику 🔥 (серия: {streak})\n\nЗанимайтесь каждый день, чтобы улучшать результаты!",
  },
};

/** Bot matni: bt(lang, key, vars) — noma'lum til uz'ga qaytadi. */
export function bt(lang: string | null | undefined, key: string, vars?: Vars): string {
  const l: Lang = lang === "ru" ? "ru" : "uz";
  const entry = DICT[key];
  let s = entry ? entry[l] : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
