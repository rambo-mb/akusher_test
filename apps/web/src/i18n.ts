import { createContext, useContext } from "react";
import type { Lang } from "@aku/shared";

export type { Lang };

type Vars = Record<string, string | number>;

// Barcha interfeys matnlari (uz + ru). Kalit -> { uz, ru }.
const DICT: Record<string, { uz: string; ru: string }> = {
  // Umumiy
  back: { uz: "← Orqaga", ru: "← Назад" },
  "app.openInTg": { uz: "Ilovani Telegram ichida oching.", ru: "Откройте приложение в Telegram." },

  // Home
  "home.title": { uz: "Akusherlik va ginekologiya", ru: "Акушерство и гинекология" },
  "home.subtitle": {
    uz: "Imtihonga tayyorlanish — test rejimini tanlang",
    ru: "Подготовка к экзамену — выберите режим теста",
  },
  "home.days": { uz: "{n} kun", ru: "{n} дн." },
  "home.continuous": { uz: "Davomiy", ru: "Серия" },
  "home.goal": { uz: "Maqsad", ru: "Цель" },
  "home.categories": { uz: "Mavzular (kategoriya)", ru: "Темы (категории)" },
  "home.all": { uz: "Barchasi", ru: "Все" },
  "home.count": { uz: "Savollar soni", ru: "Количество вопросов" },
  "home.start": { uz: "Boshlash", ru: "Начать" },
  "home.starting": { uz: "Tayyorlanmoqda…", ru: "Подготовка…" },
  "home.accuracy": { uz: "Aniqlik", ru: "Точность" },
  "home.best": { uz: "Eng yaxshi", ru: "Лучший" },
  "home.answered": { uz: "Javob", ru: "Ответы" },
  "badge.count": { uz: "{n} ta", ru: "{n} шт." },

  "nav.stats": { uz: "📊 Mening statistikam", ru: "📊 Моя статистика" },
  "nav.history": { uz: "📜 Tarix", ru: "📜 История" },
  "nav.achievements": { uz: "🏅 Yutuqlar", ru: "🏅 Достижения" },
  "nav.certificate": { uz: "🎖 Sertifikat", ru: "🎖 Сертификат" },
  "nav.referral": { uz: "🎁 Do'st taklif qil", ru: "🎁 Пригласить друга" },
  "nav.leaderboard": { uz: "🏆 Reyting", ru: "🏆 Рейтинг" },
  "nav.guide": { uz: "❔ Qo'llanma", ru: "❔ Руководство" },
  "nav.users": { uz: "👥 Foydalanuvchilar", ru: "👥 Пользователи" },
  "nav.editor": { uz: "✏️ Savol muharriri", ru: "✏️ Редактор вопросов" },

  // Rejimlar
  "mode.random.title": { uz: "Random test", ru: "Случайный тест" },
  "mode.random.desc": { uz: "Tasodifiy N ta savol", ru: "N случайных вопросов" },
  "mode.exam.title": { uz: "Imtihon", ru: "Экзамен" },
  "mode.exam.desc": { uz: "Vaqt chegarasi bilan real imtihon", ru: "Реальный экзамен с ограничением по времени" },
  "mode.hard.title": { uz: "Qiyin rejim", ru: "Сложный режим" },
  "mode.hard.desc": { uz: "Vaqt juda kam (15s), izohlar yo'q", ru: "Мало времени (15с), без пояснений" },
  "mode.study.title": { uz: "O'rganish", ru: "Обучение" },
  "mode.study.desc": { uz: "Har javobdan keyin darhol natija", ru: "Результат сразу после каждого ответа" },
  "mode.mistakes.title": { uz: "Takrorlash", ru: "Повторение" },
  "mode.mistakes.desc": { uz: "Xato savollar (interval bilan)", ru: "Ошибочные вопросы (с интервалом)" },
  "mode.bookmarks.title": { uz: "Belgilangan", ru: "Закладки" },
  "mode.bookmarks.desc": { uz: "🔖 saqlagan savollaringiz", ru: "🔖 сохранённые вопросы" },

  // Quiz
  "quiz.finish": { uz: "Yakunlash", ru: "Завершить" },
  "quiz.next": { uz: "Keyingi", ru: "Далее" },
  "quiz.bookmark": { uz: "Belgilash", ru: "Закладка" },
  "quiz.explain": { uz: "💡 Izoh", ru: "💡 Пояснение" },
  "quiz.hint": {
    uz: "Javobni tanlang — kerak bo'lsa o'zgartirishingiz mumkin. {a}/{t} belgilandi.",
    ru: "Выберите ответ — при необходимости можно изменить. Отмечено {a}/{t}.",
  },
  "quiz.exitTitle": { uz: "Testdan chiqasizmi?", ru: "Выйти из теста?" },
  "quiz.exitMsg": { uz: "Joriy natija saqlanmaydi.", ru: "Текущий результат не сохранится." },
  "quiz.finishError": { uz: "Yakunlashda xatolik", ru: "Ошибка при завершении" },

  // Result
  "result.title": { uz: "Natija", ru: "Результат" },
  "result.of": { uz: "{total} tadan", ru: "Из {total}" },
  "result.correct": { uz: "{n} to'g'ri", ru: "{n} верно" },
  "result.wrong": { uz: "{n} xato", ru: "{n} неверно" },
  "result.share": { uz: "📤 Natijani do'stlar bilan ulashish", ru: "📤 Поделиться результатом с друзьями" },
  "result.shareText": {
    uz: "Men akusherlik testida {score}% oldim! Sen ham sinab ko'r 👉",
    ru: "Я набрал {score}% в тесте по акушерству! Попробуй и ты 👉",
  },
  "result.allTab": { uz: "Hammasi ({n})", ru: "Все ({n})" },
  "result.wrongTab": { uz: "Xatolar ({n})", ru: "Ошибки ({n})" },
  "result.correctTag": { uz: " to'g'ri", ru: " верно" },
  "result.youTag": { uz: " siz", ru: " вы" },
  "result.home": { uz: "Bosh sahifa", ru: "Главная" },

  // Gate
  "gate.blockedTitle": { uz: "Ruxsat yo'q", ru: "Нет доступа" },
  "gate.blockedSub": {
    uz: "Kechirasiz, sizga ushbu botdan foydalanish ruxsati berilmagan.",
    ru: "Извините, у вас нет доступа к этому боту.",
  },
  "gate.idLabel": { uz: "ID", ru: "ID" },
  "gate.yourId": { uz: "Sizning ID", ru: "Ваш ID" },
  "gate.expiredTitle": { uz: "Obunangiz tugadi", ru: "Ваша подписка истекла" },
  "gate.trialTitle": { uz: "Bepul sinov tugadi", ru: "Бесплатная попытка использована" },
  "gate.needTitle": { uz: "Ruxsat kerak", ru: "Требуется доступ" },
  "gate.expiredSub": {
    uz: "Davom etish uchun obunani yangilang — admin tasdiqlaydi.",
    ru: "Для продолжения продлите подписку — администратор подтвердит.",
  },
  "gate.trialSub": {
    uz: "Bepul testdan foydalandingiz. Davom etish uchun to'lov qiling — admin bilan bog'laning.",
    ru: "Вы использовали бесплатный тест. Для продолжения оплатите — свяжитесь с администратором.",
  },
  "gate.needSub": {
    uz: "Bu bot yopiq. Foydalanish uchun admindan ruxsat oling.",
    ru: "Этот бот закрыт. Получите доступ у администратора.",
  },
  "gate.payTitle": { uz: "Cheksiz kirish uchun to'lov qiling", ru: "Оплатите для безлимитного доступа" },
  "gate.card": { uz: "Karta", ru: "Карта" },
  "gate.amount": { uz: "Summa", ru: "Сумма" },
  "gate.payNote": {
    uz: "To'lov qilib, chekni rasmga tushirib shu botga yuboring.",
    ru: "Оплатите, сфотографируйте чек и отправьте боту.",
  },
  "gate.sending": { uz: "Yuborilmoqda…", ru: "Отправка…" },
  "gate.reqRenew": { uz: "♻️ Yangilash so'rash", ru: "♻️ Запросить продление" },
  "gate.reqAccess": { uz: "📩 Ruxsat so'rash", ru: "📩 Запросить доступ" },
  "gate.sentTitle": { uz: "So'rovingiz yuborildi", ru: "Ваш запрос отправлен" },
  "gate.sentSub": { uz: "Admin tasdiqlagach davom etasiz.", ru: "Продолжите после подтверждения администратором." },
  "gate.checking": { uz: "Tekshirilmoqda…", ru: "Проверка…" },
  "gate.checkStatus": { uz: "🔄 Holatni tekshirish", ru: "🔄 Проверить статус" },
  "gate.contactAdmin": { uz: "💬 Admin bilan bog'lanish (to'lov)", ru: "💬 Связаться с администратором (оплата)" },

  // Stats
  "stats.title": { uz: "📊 Statistika", ru: "📊 Статистика" },
  "stats.chartTitle": { uz: "Natijalar (So'nggi testlar)", ru: "Результаты (последние тесты)" },
  "stats.completed": { uz: "Tugatilgan testlar", ru: "Завершённые тесты" },
  "stats.answered": { uz: "Javob berilgan savollar", ru: "Отвеченные вопросы" },
  "stats.correct": { uz: "To'g'ri javoblar", ru: "Правильные ответы" },
  "stats.accuracy": { uz: "Aniqlik", ru: "Точность" },
  "stats.best": { uz: "Eng yaxshi natija", ru: "Лучший результат" },
  "stats.mistakes": { uz: "Xatolar (takrorlash uchun)", ru: "Ошибки (для повторения)" },
  "stats.reminders": { uz: "Kunlik eslatmalar", ru: "Ежедневные напоминания" },
  "stats.on": { uz: "Yoqilgan", ru: "Включено" },
  "stats.off": { uz: "O'chirilgan", ru: "Выключено" },
  "stats.weakTitle": { uz: "Eng ko'p xato qilingan savollar", ru: "Вопросы с наибольшим числом ошибок" },
  "stats.wrongCount": { uz: "Xatolar soni", ru: "Число ошибок" },
  "stats.mastery": { uz: "O'zlashtirish", ru: "Освоение" },
  "stats.noChart": { uz: "Grafik uchun yetarli ma'lumot yo'q", ru: "Недостаточно данных для графика" },

  // Leaderboard
  "lb.title": { uz: "🏆 Reyting", ru: "🏆 Рейтинг" },
  "lb.sub": { uz: "To'g'ri javoblar soni bo'yicha", ru: "По количеству правильных ответов" },
  "lb.empty": { uz: "Hali natijalar yo'q", ru: "Пока нет результатов" },
  "lb.you": { uz: " — siz", ru: " — вы" },
  "lb.newNamePrompt": { uz: "Yangi ismni kiriting:", ru: "Введите новое имя:" },

  // Achievements
  "ach.title": { uz: "🏅 Yutuqlar", ru: "🏅 Достижения" },
  "ach.1.title": { uz: "Birinchi Qadam", ru: "Первый шаг" },
  "ach.1.desc": { uz: "Birinchi testni yakunlang", ru: "Завершите первый тест" },
  "ach.2.title": { uz: "Bilimdon 100", ru: "Знаток 100" },
  "ach.2.desc": { uz: "100 ta savolga javob bering", ru: "Ответьте на 100 вопросов" },
  "ach.3.title": { uz: "Mutaxassis 500", ru: "Специалист 500" },
  "ach.3.desc": { uz: "500 ta savolga javob bering", ru: "Ответьте на 500 вопросов" },
  "ach.4.title": { uz: "Hafta Qahramoni", ru: "Герой недели" },
  "ach.4.desc": { uz: "7 kunlik davomiylik (streak)", ru: "Серия из 7 дней" },
  "ach.5.title": { uz: "Mergan", ru: "Снайпер" },
  "ach.5.desc": { uz: "Kamida 90% aniqlik (50+ savolda)", ru: "Точность не менее 90% (50+ вопросов)" },
  "ach.6.title": { uz: "O'zlashtirilgan 50", ru: "Освоено 50" },
  "ach.6.desc": { uz: "50 ta savolni to'liq o'zlashtirish", ru: "Полностью освоить 50 вопросов" },
  "ach.7.title": { uz: "A'lochi", ru: "Отличник" },
  "ach.7.desc": { uz: "Testda 100% natija", ru: "100% результат в тесте" },

  // History
  "hist.title": { uz: "📜 Tarix", ru: "📜 История" },
  "hist.empty": { uz: "Hali testlar yechilmagan.", ru: "Тесты ещё не пройдены." },
  "hist.error": { uz: "Xatolik: ", ru: "Ошибка: " },

  // Referral
  "ref.title": { uz: "Do'st taklif qil", ru: "Пригласить друга" },
  "ref.subPre": {
    uz: "Har bir obuna sotib olgan do'st uchun sizga",
    ru: "За каждого друга, купившего подписку, вам",
  },
  "ref.subPost": { uz: "bonus!", ru: "бонус!" },
  "ref.days": { uz: "kun", ru: "дней" },
  "ref.invited": { uz: "Taklif qilingan", ru: "Приглашено" },
  "ref.bonusDays": { uz: "Bonus kun", ru: "Бонусные дни" },
  "ref.yourLink": { uz: "Sizning taklif havolangiz", ru: "Ваша реферальная ссылка" },
  "ref.copied": { uz: "✅ Nusxalandi", ru: "✅ Скопировано" },
  "ref.copy": { uz: "📋 Nusxalash", ru: "📋 Копировать" },
  "ref.share": { uz: "📤 Ulashish", ru: "📤 Поделиться" },
  "ref.howTitle": { uz: "Qanday ishlaydi?", ru: "Как это работает?" },
  "ref.step1": { uz: "Havolani do'stlaringizga yuboring", ru: "Отправьте ссылку друзьям" },
  "ref.step2": { uz: "Ular bot orqali obuna sotib oladi", ru: "Они оформляют подписку через бота" },
  "ref.step3pre": { uz: "Sizga avtomatik", ru: "Вам автоматически" },
  "ref.step3post": { uz: "qo'shiladi 🎉", ru: "добавится 🎉" },
  "ref.shareText": {
    uz: "Men akusherlik va ginekologiya imtihoniga shu bot orqali tayyorlanyapman! Sen ham qo'shil 👇",
    ru: "Я готовлюсь к экзамену по акушерству и гинекологии через этого бота! Присоединяйся 👇",
  },

  // Certificate
  "cert.title": { uz: "🏆 Sertifikat", ru: "🏆 Сертификат" },
  "cert.kicker": { uz: "SERTIFIKAT", ru: "СЕРТИФИКАТ" },
  "cert.sub1": { uz: "Ushbu sertifikat", ru: "Этот сертификат" },
  "cert.sub2": { uz: "ga taqdim etiladi", ru: "вручается" },
  "cert.correct": { uz: "To'g'ri javob", ru: "Правильные ответы" },
  "cert.accuracy": { uz: "Aniqlik", ru: "Точность" },
  "cert.subject": { uz: "Akusherlik va Ginekologiya", ru: "Акушерство и гинекология" },
  "cert.save": {
    uz: "📸 Saqlash uchun ekrandan surat (screenshot) oling.",
    ru: "📸 Сделайте скриншот, чтобы сохранить.",
  },

  // Onboarding / Qo'llanma
  "onb.0.title": { uz: "Xush kelibsiz!", ru: "Добро пожаловать!" },
  "onb.0.desc": {
    uz: "Akusherlik va ginekologiya imtihoniga tayyorgarlik uchun 600+ test savoli. Har kuni mashq qilib bilimingizni oshiring.",
    ru: "600+ тестовых вопросов для подготовки к экзамену по акушерству и гинекологии. Занимайтесь каждый день и повышайте знания.",
  },
  "onb.1.title": { uz: "Test rejimlari", ru: "Режимы тестов" },
  "onb.1.desc": {
    uz: "• Random — tasodifiy savollar\n• Imtihon — vaqt chegarasi bilan\n• O'rganish — darhol to'g'ri/noto'g'ri\n• Qiyin rejim — tez (15s), izohsiz",
    ru: "• Случайный — случайные вопросы\n• Экзамен — с ограничением по времени\n• Обучение — сразу верно/неверно\n• Сложный режим — быстро (15с), без пояснений",
  },
  "onb.2.title": { uz: "Belgilash va takrorlash", ru: "Закладки и повторение" },
  "onb.2.desc": {
    uz: "Yoqqan savolni 🔖 belgilang — «Belgilangan» rejimida qayta ishlang. Xato savollaringiz «Takrorlash» rejimida interval bilan qaytadi (yaxshi esda qolishi uchun).",
    ru: "Отмечайте нужные вопросы 🔖 — повторяйте их в режиме «Закладки». Ошибочные вопросы возвращаются в режиме «Повторение» с интервалами (для лучшего запоминания).",
  },
  "onb.3.title": { uz: "Streak va maqsad", ru: "Серия и цель" },
  "onb.3.desc": {
    uz: "Har kuni mashq qilib davomiylik (streak) yig'ing, kunlik maqsadingizni bajaring, yutuqlar (🏅) oching va reytingda yuqoriga ko'tariling.",
    ru: "Занимайтесь каждый день, набирайте серию, выполняйте дневную цель, открывайте достижения (🏅) и поднимайтесь в рейтинге.",
  },
  "onb.4.title": { uz: "Obuna va bonus", ru: "Подписка и бонус" },
  "onb.4.desc": {
    uz: "Bir marta BEPUL sinab ko'rasiz. Davom etish uchun admin bilan bog'lanib obuna oling. Do'st taklif qilsangiz — har bir obuna uchun sizga +7 kun bonus!",
    ru: "Один раз попробуете БЕСПЛАТНО. Для продолжения свяжитесь с администратором и оформите подписку. Пригласите друга — за каждую подписку +7 дней бонуса!",
  },
  "onb.5.title": { uz: "Tayyor!", ru: "Готово!" },
  "onb.5.desc": {
    uz: "Omad tilaymiz. Savol yoki muammo bo'lsa — botga yozing, admin javob beradi.",
    ru: "Удачи! Если есть вопрос или проблема — напишите боту, администратор ответит.",
  },
  "onb.next": { uz: "Keyingi", ru: "Далее" },
  "onb.start": { uz: "Boshlash", ru: "Начать" },
  "onb.close": { uz: "Yopish", ru: "Закрыть" },

  // ConfirmModal
  "confirm.cancel": { uz: "Bekor qilish", ru: "Отмена" },
  "confirm.exit": { uz: "Chiqish", ru: "Выйти" },
};

export function translate(lang: Lang, key: string, vars?: Vars): string {
  const entry = DICT[key];
  let s = entry ? entry[lang] : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function normalizeLangCode(code?: string | null): Lang {
  return code && code.toLowerCase().startsWith("ru") ? "ru" : "uz";
}

export interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

export const LangContext = createContext<LangCtx>({
  lang: "uz",
  setLang: () => {},
  t: (key) => key,
});

export const useLang = () => useContext(LangContext);
