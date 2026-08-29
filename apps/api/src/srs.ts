import { prisma } from "./db.js";

// Spaced repetition: box 0..5. box 5 = o'zlashtirilgan (takrorlashdan chiqadi).
const INTERVALS_DAYS = [0, 1, 3, 7, 16]; // box 0..4 uchun kutish; 5 = mastered
const DAY_MS = 86_400_000;
export const MASTERED_BOX = 5;

/** Javob berilganda SRS holatini yangilaydi */
export async function recordAnswer(userId: number, questionId: number, isCorrect: boolean) {
  const existing = await prisma.userQuestion.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  const box = existing?.box ?? 0;
  let newBox: number;
  let dueAt: Date;
  let rightStreak: number;
  let wrongCount = existing?.wrongCount ?? 0;

  if (isCorrect) {
    newBox = Math.min(box + 1, MASTERED_BOX);
    rightStreak = (existing?.rightStreak ?? 0) + 1;
    const days = INTERVALS_DAYS[Math.min(newBox, INTERVALS_DAYS.length - 1)] ?? 30;
    dueAt = new Date(Date.now() + days * DAY_MS);
  } else {
    newBox = 0;
    rightStreak = 0;
    wrongCount += 1;
    dueAt = new Date(); // darhol takrorlash uchun
  }

  await prisma.userQuestion.upsert({
    where: { userId_questionId: { userId, questionId } },
    update: { box: newBox, dueAt, rightStreak, wrongCount },
    create: {
      userId,
      questionId,
      box: newBox,
      dueAt,
      rightStreak,
      wrongCount: isCorrect ? 0 : 1,
    },
  });
}

/** Takrorlash uchun: xato bo'lgan, o'zlashtirilmagan, muddati kelgan savol id'lari */
export async function getDueReviewIds(userId: number, limit: number): Promise<number[]> {
  const rows = await prisma.userQuestion.findMany({
    where: {
      userId,
      wrongCount: { gt: 0 },
      box: { lt: MASTERED_BOX },
      dueAt: { lte: new Date() },
    },
    orderBy: { dueAt: "asc" },
    take: limit,
    select: { questionId: true },
  });
  return rows.map((r) => r.questionId);
}

/** Takrorlash uchun kutayotgan savollar soni (Home badge) */
export async function getDueReviewCount(userId: number): Promise<number> {
  return prisma.userQuestion.count({
    where: {
      userId,
      wrongCount: { gt: 0 },
      box: { lt: MASTERED_BOX },
      dueAt: { lte: new Date() },
    },
  });
}

/** Eski AttemptAnswer tarixidan SRS holatini bir marta tiklaydi (UserQuestion bo'sh bo'lsa) */
export async function backfillSrs(): Promise<number> {
  const count = await prisma.userQuestion.count();
  if (count > 0) return 0;

  const answers = await prisma.attemptAnswer.findMany({
    select: {
      questionId: true,
      isCorrect: true,
      attempt: { select: { userId: true } },
    },
    orderBy: { answeredAt: "asc" },
  });

  type S = { userId: number; questionId: number; box: number; wrongCount: number; rightStreak: number };
  const map = new Map<string, S>();
  for (const a of answers) {
    const key = `${a.attempt.userId}-${a.questionId}`;
    const s = map.get(key) ?? {
      userId: a.attempt.userId,
      questionId: a.questionId,
      box: 0,
      wrongCount: 0,
      rightStreak: 0,
    };
    if (a.isCorrect) {
      s.box = Math.min(s.box + 1, MASTERED_BOX);
      s.rightStreak += 1;
    } else {
      s.box = 0;
      s.rightStreak = 0;
      s.wrongCount += 1;
    }
    map.set(key, s);
  }

  const rows = [...map.values()].map((s) => ({ ...s, dueAt: new Date() }));
  if (rows.length) {
    await prisma.userQuestion.createMany({ data: rows, skipDuplicates: true });
  }
  return rows.length;
}
