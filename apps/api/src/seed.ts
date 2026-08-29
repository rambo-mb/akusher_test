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
export async function seedQuestions(prisma: PrismaClient): Promise<number> {
  const path = resolve(__dirname, "../../../data/questions.json");
  const all: RawQuestion[] = JSON.parse(readFileSync(path, "utf-8"));
  const clean = all.filter(
    (q) => !q.needsReview && q.correctIndex >= 0 && q.options.length >= 2,
  );

  for (const q of clean) {
    const data = {
      number: q.number,
      topic: q.topic,
      stem: q.stem,
      options: q.options,
      correctIndex: q.correctIndex,
      needsReview: q.needsReview,
    };
    await prisma.question.upsert({
      where: { id: q.id },
      update: data,
      create: { id: q.id, ...data },
    });
  }
  return clean.length;
}
