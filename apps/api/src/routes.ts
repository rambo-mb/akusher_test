import type { FastifyInstance } from "fastify";
import type { Bot } from "grammy";
import type {
  AdminQuestion,
  AdminStats,
  AdminUser,
  AdminUserDetail,
  AnswerRequest,
  AnswerResponse,
  AuthResponse,
  FinishResponse,
  LeaderboardEntry,
  MeStats,
  QuizMode,
  StartQuizRequest,
  StartQuizResponse,
  UserStatus,
} from "@aku/shared";
import { EXAM_SECONDS_PER_QUESTION } from "@aku/shared";
import { prisma } from "./db.js";
import { env } from "./env.js";
import {
  effectiveStatus,
  isAdminTelegramId,
  requireAdmin,
  requireApproved,
  requireAuth,
  signToken,
  verifyInitData,
} from "./auth.js";
import { approvalKeyboard, approveUser, blockUser, notifyAdmin, notifyUser } from "./access.js";
import { getDueReviewCount, getDueReviewIds, recordAnswer } from "./srs.js";

const MAX_COUNT = 100;

export async function registerRoutes(app: FastifyInstance, bot: Bot) {
  // --- Auth: Telegram initData -> JWT ---
  app.post<{ Body: { initData: string } }>("/api/auth", async (req, reply) => {
    const initData = req.body?.initData;
    if (!initData) return reply.code(400).send({ error: "initData yo'q" });

    const tgUser = verifyInitData(initData);
    if (!tgUser) return reply.code(401).send({ error: "initData yaroqsiz" });

    const admin = isAdminTelegramId(tgUser.id);
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(tgUser.id) },
      update: {
        firstName: tgUser.first_name,
        username: tgUser.username ?? null,
        ...(admin ? { status: "approved" } : {}),
      },
      create: {
        telegramId: BigInt(tgUser.id),
        firstName: tgUser.first_name,
        username: tgUser.username ?? null,
        status: admin ? "approved" : "pending",
      },
    });

    const res: AuthResponse = {
      token: signToken(user.id),
      user: {
        id: user.id,
        firstName: user.firstName,
        username: user.username,
        status: effectiveStatus(user),
        isAdmin: admin,
        telegramId: String(user.telegramId),
        accessUntil: user.accessUntil ? user.accessUntil.toISOString() : null,
      },
      config: {
        adminUsername: env.ADMIN_USERNAME,
        priceInfo: env.PRICE_INFO,
      },
    };
    return res;
  });

  // --- Access: ruxsat / obunani yangilash so'rovi (adminга bildirishnoma) ---
  app.post("/api/access/request", { preHandler: requireAuth }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return reply.code(401).send({ error: "Foydalanuvchi topilmadi" });
    const eff = effectiveStatus(user);
    if (eff === "approved") return { status: "approved" as UserStatus };
    if (eff === "blocked") {
      return reply.code(403).send({ error: "Siz bloklangansiz", status: "blocked" as UserStatus });
    }
    const uname = user.username ? `@${user.username}` : "(username yo'q)";
    const kind = eff === "expired" ? "♻️ Obunani yangilash so'rovi" : "🔔 Yangi ruxsat so'rovi";
    await notifyAdmin(
      bot,
      `${kind}:\n👤 ${user.firstName} ${uname}\n🆔 ${user.telegramId}`,
      approvalKeyboard(user.id),
    );
    return { status: eff as UserStatus };
  });

  // --- Admin: foydalanuvchilar ro'yxati ---
  app.get("/api/admin/users", { preHandler: [requireAuth, requireAdmin] }, async () => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    const counts = await prisma.$queryRaw<{ userId: number; c: bigint }[]>`
      SELECT a."userId" AS "userId", COUNT(*) AS c
      FROM "AttemptAnswer" aa JOIN "Attempt" a ON a.id = aa."attemptId"
      GROUP BY a."userId"
    `;
    const cmap = new Map(counts.map((r) => [r.userId, Number(r.c)]));
    const list: AdminUser[] = users.map((u) => ({
      id: u.id,
      telegramId: String(u.telegramId),
      firstName: u.firstName,
      username: u.username,
      status: effectiveStatus(u),
      accessUntil: u.accessUntil ? u.accessUntil.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      answered: cmap.get(u.id) ?? 0,
    }));
    const stats: AdminStats = {
      total: list.length,
      pending: list.filter((u) => u.status === "pending").length,
      approved: list.filter((u) => u.status === "approved").length,
      blocked: list.filter((u) => u.status === "blocked").length,
    };
    return { users: list, stats };
  });

  // --- Admin: foydalanuvchi tafsiloti ---
  app.get<{ Params: { id: string } }>(
    "/api/admin/users/:id",
    { preHandler: [requireAuth, requireAdmin] },
    async (req, reply) => {
      const id = Number(req.params.id);
      const u = await prisma.user.findUnique({ where: { id } });
      if (!u) return reply.code(404).send({ error: "Topilmadi" });
      const answers = await prisma.attemptAnswer.findMany({
        where: { attempt: { userId: id } },
        select: { isCorrect: true, answeredAt: true },
        orderBy: { answeredAt: "desc" },
      });
      const attempts = await prisma.attempt.count({
        where: { userId: id, finishedAt: { not: null } },
      });
      const answered = answers.length;
      const correct = answers.filter((a) => a.isCorrect).length;
      const detail: AdminUserDetail = {
        id: u.id,
        telegramId: String(u.telegramId),
        firstName: u.firstName,
        username: u.username,
        status: effectiveStatus(u),
        accessUntil: u.accessUntil ? u.accessUntil.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        answered,
        attempts,
        correct,
        accuracy: answered ? Math.round((correct / answered) * 100) : 0,
        lastActive: answers[0]?.answeredAt ? answers[0].answeredAt.toISOString() : null,
      };
      return detail;
    },
  );

  // --- Admin: tasdiqlash (muddat bilan) / bloklash ---
  app.post<{ Params: { id: string }; Body: { days?: number } }>(
    "/api/admin/users/:id/approve",
    { preHandler: [requireAuth, requireAdmin] },
    async (req) => {
      const u = await approveUser(bot, Number(req.params.id), req.body?.days);
      return { id: u.id, status: u.status, accessUntil: u.accessUntil?.toISOString() ?? null };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/admin/users/:id/block",
    { preHandler: [requireAuth, requireAdmin] },
    async (req) => {
      const u = await blockUser(bot, Number(req.params.id));
      return { id: u.id, status: u.status };
    },
  );

  // --- Admin: broadcast (barcha faol foydalanuvchilarga) ---
  app.post<{ Body: { text: string } }>(
    "/api/admin/broadcast",
    { preHandler: [requireAuth, requireAdmin] },
    async (req, reply) => {
      const text = (req.body?.text ?? "").trim();
      if (!text) return reply.code(400).send({ error: "Matn bo'sh" });
      const users = await prisma.user.findMany({
        where: { status: "approved" },
        select: { telegramId: true },
      });
      let sent = 0;
      for (const u of users) {
        await notifyUser(bot, u.telegramId, `📢 ${text}`);
        sent++;
        await new Promise((r) => setTimeout(r, 40)); // yumshoq rate-limit
      }
      return { sent, total: users.length };
    },
  );

  // --- Admin: savol muharriri (ro'yxat) ---
  app.get<{ Querystring: { filter?: string; search?: string; skip?: string; take?: string } }>(
    "/api/admin/questions",
    { preHandler: [requireAuth, requireAdmin] },
    async (req) => {
      const search = (req.query.search ?? "").trim();
      const where = {
        ...(req.query.filter === "needsReview" ? { needsReview: true } : {}),
        ...(search ? { stem: { contains: search, mode: "insensitive" as const } } : {}),
      };
      const take = Math.min(Math.max(Number(req.query.take ?? 20), 1), 50);
      const skip = Math.max(Number(req.query.skip ?? 0), 0);
      const [questions, total, needsReview] = await Promise.all([
        prisma.question.findMany({ where, orderBy: { number: "asc" }, skip, take }),
        prisma.question.count({ where }),
        prisma.question.count({ where: { needsReview: true } }),
      ]);
      const list: AdminQuestion[] = questions.map((q) => ({
        id: q.id,
        number: q.number,
        topic: q.topic,
        stem: q.stem,
        options: q.options,
        correctIndex: q.correctIndex,
        needsReview: q.needsReview,
        explanation: q.explanation,
        category: q.category,
      }));
      return { questions: list, total, needsReview };
    },
  );

  // --- Admin: savolni tahrirlash ---
  app.put<{ Params: { id: string }; Body: Partial<AdminQuestion> }>(
    "/api/admin/questions/:id",
    { preHandler: [requireAuth, requireAdmin] },
    async (req, reply) => {
      const id = Number(req.params.id);
      const b = req.body ?? {};
      const data: {
        stem?: string;
        options?: string[];
        correctIndex?: number;
        explanation?: string | null;
        category?: string | null;
        needsReview?: boolean;
      } = {};
      if (typeof b.stem === "string") data.stem = b.stem.trim();
      if (Array.isArray(b.options)) {
        data.options = b.options.map((o) => String(o).trim()).filter(Boolean);
      }
      if (typeof b.correctIndex === "number") data.correctIndex = b.correctIndex;
      if (typeof b.explanation === "string") data.explanation = b.explanation.trim() || null;
      if (typeof b.category === "string") data.category = b.category.trim() || null;
      if (typeof b.needsReview === "boolean") data.needsReview = b.needsReview;

      // Yaroqlilik: to'g'ri javob indeksi variantlar ichida bo'lishi kerak
      const opts = data.options;
      const ci = data.correctIndex;
      if (opts && ci !== undefined && (ci < 0 || ci >= opts.length)) {
        return reply.code(400).send({ error: "correctIndex variantlar chegarasidan tashqarida" });
      }
      const updated = await prisma.question.update({ where: { id }, data });
      return { ok: true, needsReview: updated.needsReview };
    },
  );

  // --- Quiz: start ---
  app.post<{ Body: StartQuizRequest }>(
    "/api/quiz/start",
    { preHandler: [requireAuth, requireApproved] },
    async (req, reply) => {
      const userId = req.userId!;
      const mode = (req.body?.mode ?? "random") as QuizMode;
      let count = Math.min(Math.max(Number(req.body?.count ?? 20), 1), MAX_COUNT);

      let questionIds: number[];

      if (mode === "mistakes") {
        questionIds = shuffle(await getDueReviewIds(userId, count));
        if (questionIds.length === 0) {
          return reply
            .code(400)
            .send({ error: "Takrorlash uchun savol yo'q — avval boshqa test yeching" });
        }
      } else if (mode === "bookmarks") {
        const marks = await prisma.bookmark.findMany({
          where: { userId, question: { needsReview: false, correctIndex: { gte: 0 } } },
          select: { questionId: true },
        });
        questionIds = shuffle(marks.map((m) => m.questionId)).slice(0, count);
        if (questionIds.length === 0) {
          return reply.code(400).send({ error: "Belgilangan savol yo'q — testда 🔖 bosing" });
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

      const [rows, marks] = await Promise.all([
        prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, number: true, topic: true, stem: true, options: true },
        }),
        prisma.bookmark.findMany({
          where: { userId, questionId: { in: questionIds } },
          select: { questionId: true },
        }),
      ]);
      const marked = new Set(marks.map((m) => m.questionId));
      const order = new Map(questionIds.map((id, i) => [id, i]));
      const questions = rows
        .map((q) => ({ ...q, bookmarked: marked.has(q.id) }))
        .sort((a, b) => order.get(a.id)! - order.get(b.id)!);

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
    { preHandler: [requireAuth, requireApproved] },
    async (req, reply) => {
      const userId = req.userId!;
      const attemptId = Number(req.params.attemptId);
      const { questionId, selectedIndex } = req.body ?? {};

      const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, userId } });
      if (!attempt) return reply.code(404).send({ error: "Seans topilmadi" });

      const question = await prisma.question.findUnique({ where: { id: questionId } });
      if (!question) return reply.code(404).send({ error: "Savol topilmadi" });

      const isCorrect = selectedIndex === question.correctIndex;

      const existing = await prisma.attemptAnswer.findUnique({
        where: { attemptId_questionId: { attemptId, questionId } },
      });
      await prisma.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId } },
        update: { selectedIndex, isCorrect },
        create: { attemptId, questionId, selectedIndex, isCorrect },
      });

      // SRS holatini yangilaymiz (faqat birinchi javobda, qayta yozishda emas)
      if (!existing) await recordAnswer(userId, questionId, isCorrect);

      const res: AnswerResponse = {
        isCorrect,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
      };
      return res;
    },
  );

  // --- Quiz: finish ---
  app.post<{ Params: { attemptId: string } }>(
    "/api/quiz/:attemptId/finish",
    { preHandler: [requireAuth, requireApproved] },
    async (req, reply) => {
      const userId = req.userId!;
      const attemptId = Number(req.params.attemptId);

      const attempt = await prisma.attempt.findFirst({
        where: { id: attemptId, userId },
        include: { answers: { include: { question: true } } },
      });
      if (!attempt) return reply.code(404).send({ error: "Seans topilmadi" });

      const answeredCorrect = attempt.answers.filter((a) => a.isCorrect).length;
      const total = attempt.count;
      const correctCount = Math.min(answeredCorrect, total);
      const score = total > 0 ? Math.min(100, Math.round((correctCount / total) * 100)) : 0;

      await prisma.attempt.update({
        where: { id: attemptId },
        data: { finishedAt: new Date(), correctCount, score },
      });

      const today = new Date().toISOString().split("T")[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split("T")[0];

      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) {
        let newStreak = u.streak;
        if (u.lastActiveOn === yesterday) {
          newStreak += 1;
        } else if (u.lastActiveOn !== today) {
          newStreak = 1;
        }
        await prisma.user.update({
          where: { id: userId },
          data: { streak: newStreak, lastActiveOn: today },
        });
      }

      const items = attempt.answers
        .map((a) => ({
          questionId: a.questionId,
          number: a.question.number,
          stem: a.question.stem,
          options: a.question.options,
          correctIndex: a.question.correctIndex,
          selectedIndex: a.selectedIndex,
          isCorrect: a.isCorrect,
          explanation: a.question.explanation,
        }))
        .sort((x, y) => x.number - y.number);

      const res: FinishResponse = { attemptId, total, correctCount, score, items };
      return res;
    },
  );

  // --- Stats: me ---
  app.get("/api/stats/me", { preHandler: [requireAuth, requireApproved] }, async (req): Promise<MeStats> => {
    const userId = req.userId!;
    const answers = await prisma.attemptAnswer.findMany({
      where: { attempt: { userId } },
      select: { questionId: true, isCorrect: true },
    });
    const totalAnswered = answers.length;
    const totalCorrect = answers.filter((a) => a.isCorrect).length;
    const today = new Date().toISOString().split("T")[0];
    const [totalAttempts, best, user, answersToday, masteredCount] = await Promise.all([
      prisma.attempt.count({ where: { userId, finishedAt: { not: null } } }),
      prisma.attempt.aggregate({ where: { userId }, _max: { score: true } }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.attemptAnswer.count({
        where: {
          attempt: { userId },
          answeredAt: {
            gte: new Date(today + "T00:00:00.000Z"),
          },
        },
      }),
      prisma.userQuestion.count({ where: { userId, box: { gte: 5 } } }),
    ]);
    const mistakesCount = await getDueReviewCount(userId);
    return {
      totalAttempts,
      totalAnswered,
      totalCorrect,
      accuracy: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      mistakesCount,
      bestScore: best._max.score ?? 0,
      streak: user?.streak ?? 0,
      dailyGoal: user?.dailyGoal ?? 20,
      answeredToday: answersToday,
      masteredCount,
    };
  });

  // --- Daily Goal ---
  app.put<{ Body: { goal: number } }>(
    "/api/me/daily-goal",
    { preHandler: [requireAuth, requireApproved] },
    async (req) => {
      const goal = Math.max(1, req.body?.goal ?? 20);
      await prisma.user.update({
        where: { id: req.userId! },
        data: { dailyGoal: goal },
      });
      return { ok: true, dailyGoal: goal };
    },
  );

  // --- Gamification: History & Stats ---
  app.get("/api/attempts", { preHandler: [requireAuth, requireApproved] }, async (req) => {
    const attempts = await prisma.attempt.findMany({
      where: { userId: req.userId!, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      take: 50,
      select: { id: true, mode: true, count: true, correctCount: true, score: true, finishedAt: true },
    });
    return attempts.map(a => ({
      ...a,
      finishedAt: a.finishedAt!.toISOString(),
    }));
  });

  app.get<{ Params: { id: string } }>("/api/attempts/:id", { preHandler: [requireAuth, requireApproved] }, async (req, reply) => {
    const attempt = await prisma.attempt.findFirst({
      where: { id: Number(req.params.id), userId: req.userId!, finishedAt: { not: null } },
      include: { answers: { include: { question: true } } },
    });
    if (!attempt) return reply.code(404).send({ error: "Seans topilmadi" });

    const items = attempt.answers
      .map((a) => ({
        questionId: a.questionId,
        number: a.question.number,
        stem: a.question.stem,
        options: a.question.options,
        correctIndex: a.question.correctIndex,
        selectedIndex: a.selectedIndex,
        isCorrect: a.isCorrect,
        explanation: a.question.explanation,
      }))
      .sort((x, y) => x.number - y.number);

    const res: FinishResponse = {
      attemptId: attempt.id,
      total: attempt.count,
      correctCount: attempt.correctCount,
      score: attempt.score,
      items,
    };
    return res;
  });

  app.get("/api/stats/weak", { preHandler: [requireAuth, requireApproved] }, async (req) => {
    const weak = await prisma.userQuestion.findMany({
      where: { userId: req.userId!, wrongCount: { gt: 0 } },
      orderBy: { wrongCount: "desc" },
      take: 20,
      include: { question: { select: { stem: true } } },
    });
    return weak.map(w => ({
      questionId: w.questionId,
      stem: w.question.stem,
      wrongCount: w.wrongCount,
      box: w.box,
    }));
  });

  // --- Home badge'lari: takrorlash va belgilangan savol soni ---
  app.get("/api/mistakes/count", { preHandler: [requireAuth, requireApproved] }, async (req) => {
    const count = await getDueReviewCount(req.userId!);
    return { count };
  });
  app.get("/api/bookmarks/count", { preHandler: [requireAuth, requireApproved] }, async (req) => {
    const count = await prisma.bookmark.count({ where: { userId: req.userId! } });
    return { count };
  });

  // --- Bookmark toggle ---
  app.post<{ Params: { questionId: string } }>(
    "/api/bookmarks/:questionId/toggle",
    { preHandler: [requireAuth, requireApproved] },
    async (req) => {
      const userId = req.userId!;
      const questionId = Number(req.params.questionId);
      const existing = await prisma.bookmark.findUnique({
        where: { userId_questionId: { userId, questionId } },
      });
      if (existing) {
        await prisma.bookmark.delete({ where: { id: existing.id } });
        return { bookmarked: false };
      }
      await prisma.bookmark.create({ data: { userId, questionId } });
      return { bookmarked: true };
    },
  );

  // --- Leaderboard ---
  app.get("/api/leaderboard", { preHandler: [requireAuth, requireAdmin] }, async (req): Promise<LeaderboardEntry[]> => {
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
