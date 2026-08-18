import { prisma } from "../lib/prisma";
import { runSeed } from "./seed/run-seed";

runSeed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
