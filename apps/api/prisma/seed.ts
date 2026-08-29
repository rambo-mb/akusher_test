import { PrismaClient } from "../generated/prisma/index.js";
import { seedQuestions } from "../src/seed.js";

const prisma = new PrismaClient();

async function main() {
  const n = await seedQuestions(prisma);
  console.log(`Yuklandi/yangilandi: ${n} ta toza savol.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
