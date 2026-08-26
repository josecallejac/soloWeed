import { prisma } from "../src/lib/prisma";
import { runScrape } from "./scrape";

runScrape({ mode: "weekly" })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
