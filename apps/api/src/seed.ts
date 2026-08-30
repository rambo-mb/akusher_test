import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { PrismaClient } from "../generated/prisma/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RawQuestion {
  id: number;
  number: number;
  topic: string;
  stem: string;
  options: string[];
  correctIndex: number;
  needsReview: boolean;
}

/**
 * data/questions.json dagi TOZA savollarni bazaga idempotent yuklaydi (upsert).
 * Foydalanuvchi javoblarini o'chirmaydi — har ishga tushishда xavfsiz chaqirsa bo'ladi.
 */
/**
 * data/questions.json dagi BARCHA savollarni (needsReview ham) bazaga qo'shadi.
 * Faqat YANGI savollar qo'shiladi — mavjudlari o'zgartirilmaydi (admin tahrirlari saqlanadi).
 * Quiz faqat needsReview=false savollarni beradi; admin muharrir needsReview'larni tuzatadi.
 */
export async function seedQuestions(prisma: PrismaClient): Promise<number> {
  const path = resolve(__dirname, "../../../data/questions.json");
  const all: RawQuestion[] = JSON.parse(readFileSync(path, "utf-8"));

  const existing = await prisma.question.findMany({ select: { id: true } });
  const have = new Set(existing.map((e) => e.id));
  const toAdd = all.filter((q) => !have.has(q.id));

  if (toAdd.length) {
    await prisma.question.createMany({
      data: toAdd.map((q) => ({
        id: q.id,
        number: q.number,
        topic: q.topic,
        stem: q.stem,
        options: q.options,
        correctIndex: q.correctIndex,
        needsReview: q.needsReview,
      })),
      skipDuplicates: true,
    });
  }
  return toAdd.length; // yangi qo'shilganlar soni
}

/**
 * questions.json'даги BARCHA savollarni bazaga to'liq sinxronlaydi (upsert).
 * Mavjud savollarning matn/variant/to'g'ri javob/needsReview'ini YANGILAYDI,
 * lekin admin qo'shgan `explanation`/`category`ни saqlaydi (ularга tegmaydi).
 * Admin qo'lда (bir tugma bilan) ishga tushiradi — docx tuzatilгандан keyin.
 */
export async function reimportQuestions(
  prisma: PrismaClient,
): Promise<{ total: number; created: number; updated: number }> {
  const path = resolve(__dirname, "../../../data/questions.json");
  const all: RawQuestion[] = JSON.parse(readFileSync(path, "utf-8"));

  const existing = await prisma.question.findMany({ select: { id: true } });
  const have = new Set(existing.map((e) => e.id));
  let created = 0;
  let updated = 0;

  for (const q of all) {
    const content = {
      number: q.number,
      topic: q.topic,
      stem: q.stem,
      options: q.options,
      correctIndex: q.correctIndex,
      needsReview: q.needsReview,
    };
    await prisma.question.upsert({
      where: { id: q.id },
      update: content, // explanation/category tegilmaydi -> admin izohlari saqlanadi
      create: { id: q.id, ...content },
    });
    if (have.has(q.id)) updated++;
    else created++;
  }
  return { total: all.length, created, updated };
}
