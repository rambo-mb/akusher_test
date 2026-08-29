import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();
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

async function main() {
  const path = resolve(__dirname, "../../../data/questions.json");
  const all: RawQuestion[] = JSON.parse(readFileSync(path, "utf-8"));

  // Faqat toza (tekshirilgan) savollar: needsReview=false, to'g'ri javobi bor, 4 variant
  const usable = all.filter(
    (q) => !q.needsReview && q.correctIndex >= 0 && q.options.length >= 2,
  );
  const skipped = all.length - usable.length;

  console.log(`Fayldagi savollar: ${all.length}, toza (yuklanadi): ${usable.length}, hozircha tashlangan: ${skipped}`);

  // Toza yuklash
  await prisma.attemptAnswer.deleteMany();
  await prisma.question.deleteMany();

  const BATCH = 200;
  for (let i = 0; i < usable.length; i += BATCH) {
    const batch = usable.slice(i, i + BATCH);
    await prisma.question.createMany({
      data: batch.map((q) => ({
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

  const count = await prisma.question.count();
  const review = await prisma.question.count({ where: { needsReview: true } });
  console.log(`DB'ga yuklandi: ${count} savol (${review} tasi needsReview).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
