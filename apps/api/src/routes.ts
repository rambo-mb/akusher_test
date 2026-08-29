import type { FastifyInstance } from "fastify";
import type {
  AnswerRequest,
  AnswerResponse,
  AuthResponse,
  FinishResponse,
  LeaderboardEntry,
  MeStats,
  QuizMode,
  StartQuizRequest,
  StartQuizResponse,
} from "@aku/shared";
import { EXAM_SECONDS_PER_QUESTION } from "@aku/shared";
import { prisma } from "./db.js";
import { requireAuth, signToken, verifyInitData } from "./auth.js";

const MAX_COUNT = 100;

export async function registerRoutes(app: FastifyInstance) {
  // --- Auth: Telegram initData -> JWT ---
  app.post<{ Body: { initData: string } }>("/api/auth", async (req, reply) => {
    const initData = req.body?.initData;
    if (!initData) return reply.code(400).send({ error: "initData yo'q" });

    const tgUser = verifyInitData(initData);
    if (!tgUser) return reply.code(401).send({ error: "initData yaroqsiz" });

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(tgUser.id) },
      update: { firstName: tgUser.first_name, username: tgUser.username ?? null },
      create: {
        telegramId: BigInt(tgUser.id),
        firstName: tgUser.first_name,
        username: tgUser.username ?? null,
      },
    });

    const res: AuthResponse = {
      token: signToken(user.id),
      user: { id: user.id, firstName: user.firstName, username: user.username },
    };
    return res;
  });

  // --- Quiz: start ---
  app.post<{ Body: StartQuizRequest }>(
    "/api/quiz/start",
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = req.userId!;
      const mode = (req.body?.mode ?? "random") as QuizMode;
      let count = Math.min(Math.max(Number(req.body?.count ?? 20), 1), MAX_COUNT);

      let questionIds: number[];

      if (mode === "mistakes") {
        questionIds = await getMistakeQuestionIds(userId);
        questionIds = shuffle(questionIds).slice(0, count);
        if (questionIds.length === 0) {
          return reply.code(400).send({ error: "Xatolar yo'q — avval boshqa test yeching" });
        }
      } else {
        // Tasodifiy: faqat toza savollar (tekshirilgan, to'g'ri javobi bor, 4 variant)
        const rows = await prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM "Question"
          WHERE "needsReview" = false AND "correctIndex" >= 0 AND array_length(options, 1) >= 2
          ORDER BY random() LIMIT ${count}
        `;
        questionIds = rows.map((r) => r.id);
      }

      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, number: true, topic: true, stem: true, options: true },
      });
      // random tartibni saqlash
      const order = new Map(questionIds.map((id, i) => [id, i]));
      questions.sort((a, b) => (order.get(a.id)! - order.get(b.id)!));

      const attempt = await prisma.attempt.create({
        data: { userId, mode, count: questions.length },
      });

      const res: StartQuizResponse = {
        attemptId: attempt.id,
        mode,
        timeLimitSec: mode === "exam" ? questions.length * EXAM_SECONDS_PER_QUESTION : null,
        questions,
      };
      return res;
    },
  );

  // --- Quiz: answer ---
  app.post<{ Params: { attemptId: string }; Body: AnswerRequest }>(
    "/api/quiz/:attemptId/answer",
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = req.userId!;
      const attemptId = Number(req.params.attemptId);
      const { questionId, selectedIndex } = req.body ?? {};

      const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, userId } });
      if (!attempt) return reply.code(404).send({ error: "Seans topilmadi" });

      const question = await prisma.question.findUnique({ where: { id: questionId } });
      if (!question) return reply.code(404).send({ error: "Savol topilmadi" });

      const isCorrect = selectedIndex === question.correctIndex;

      await prisma.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId } },
        update: { selectedIndex, isCorrect },
        create: { attemptId, questionId, selectedIndex, isCorrect },
      });

      const res: AnswerResponse = { isCorrect, correctIndex: question.correctIndex };
      return res;
    },
  );

  // --- Quiz: finish ---
  app.post<{ Params: { attemptId: string } }>(
    "/api/quiz/:attemptId/finish",
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = req.userId!;
      const attemptId = Number(req.params.attemptId);

      const attempt = await prisma.attempt.findFirst({
        where: { id: attemptId, userId },
        include: { answers: { include: { question: true } } },
      });
      if (!attempt) return reply.code(404).send({ error: "Seans topilmadi" });

      const correctCount = attempt.answers.filter((a) => a.isCorrect).length;
      const total = attempt.count;
      const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

      await prisma.attempt.update({
        where: { id: attemptId },
        data: { finishedAt: new Date(), correctCount, score },
      });

      const wrong = attempt.answers
        .filter((a) => !a.isCorrect)
        .map((a) => ({
          questionId: a.questionId,
          number: a.question.number,
          stem: a.question.stem,
          options: a.question.options,
          correctIndex: a.question.correctIndex,
          selectedIndex: a.selectedIndex,
        }));

      const res: FinishResponse = { attemptId, total, correctCount, score, wrong };
      return res;
    },
  );

  // --- Stats: me ---
  app.get("/api/stats/me", { preHandler: requireAuth }, async (req): Promise<MeStats> => {
    const userId = req.userId!;
    const answers = await prisma.attemptAnswer.findMany({
      where: { attempt: { userId } },
      select: { questionId: true, isCorrect: true },
    });
    const totalAnswered = answers.length;
    const totalCorrect = answers.filter((a) => a.isCorrect).length;
    const [totalAttempts, best] = await Promise.all([
      prisma.attempt.count({ where: { userId, finishedAt: { not: null } } }),
      prisma.attempt.aggregate({ where: { userId }, _max: { score: true } }),
    ]);
    const mistakes = await getMistakeQuestionIds(userId);
    return {
      totalAttempts,
      totalAnswered,
      totalCorrect,
      accuracy: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      mistakesCount: mistakes.length,
      bestScore: best._max.score ?? 0,
    };
  });

  // --- Mistakes count (Home ekranida ko'rsatish uchun) ---
  app.get("/api/mistakes/count", { preHandler: requireAuth }, async (req) => {
    const ids = await getMistakeQuestionIds(req.userId!);
    return { count: ids.length };
  });

  // --- Leaderboard ---
  app.get("/api/leaderboard", { preHandler: requireAuth }, async (req): Promise<LeaderboardEntry[]> => {
    const userId = req.userId!;
    const rows = await prisma.$queryRaw<
      { userId: number; firstName: string; username: string | null; correct: bigint; total: bigint }[]
    >`
      SELECT u.id AS "userId", u."firstName", u.username,
             COUNT(*) FILTER (WHERE aa."isCorrect") AS correct,
             COUNT(*) AS total
      FROM "AttemptAnswer" aa
      JOIN "Attempt" a ON a.id = aa."attemptId"
      JOIN "User" u ON u.id = a."userId"
      GROUP BY u.id
      ORDER BY correct DESC, total ASC
      LIMIT 50
    `;
    return rows.map((r, i) => ({
      rank: i + 1,
      firstName: r.firstName,
      username: r.username,
      totalCorrect: Number(r.correct),
      accuracy: Number(r.total) ? Math.round((Number(r.correct) / Number(r.total)) * 100) : 0,
      isMe: r.userId === userId,
    }));
  });
}

// Foydalanuvchi xato qilgan va hali to'g'ri javob bermagan savollar
async function getMistakeQuestionIds(userId: number): Promise<number[]> {
  const answers = await prisma.attemptAnswer.findMany({
    where: { attempt: { userId } },
    select: { questionId: true, isCorrect: true },
  });
  const wrong = new Set<number>();
  const correct = new Set<number>();
  for (const a of answers) {
    if (a.isCorrect) correct.add(a.questionId);
    else wrong.add(a.questionId);
  }
  return [...wrong].filter((id) => !correct.has(id));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
