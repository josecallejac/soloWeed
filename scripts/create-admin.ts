import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("ADMIN_PASSWORD must be at least 10 characters long.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await prisma.$executeRaw`
    INSERT INTO "User" ("email", "passwordHash", "role", "createdAt", "updatedAt")
    VALUES (${email}, ${passwordHash}, 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT("email") DO UPDATE SET
      "passwordHash" = ${passwordHash},
      "role" = 'ADMIN',
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
