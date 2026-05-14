import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { hashToken } from "./password";

const SESSION_COOKIE = "soloweed_session";
const SESSION_DAYS = 14;

export type CurrentUser = {
  email: string;
  id: number;
  role: string;
};

type SessionRow = {
  email: string;
  expiresAt: Date;
  id: number;
  role: string;
  userId: number;
};

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$executeRaw`
    INSERT INTO "Session" ("tokenHash", "userId", "expiresAt", "createdAt")
    VALUES (${hashToken(token)}, ${userId}, ${expiresAt}, CURRENT_TIMESTAMP)
  `;

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const sessions = await prisma.$queryRaw<SessionRow[]>`
    SELECT "Session"."id", "Session"."userId", "Session"."expiresAt", "User"."email", "User"."role"
    FROM "Session"
    INNER JOIN "User" ON "User"."id" = "Session"."userId"
    WHERE "Session"."tokenHash" = ${hashToken(token)}
    LIMIT 1
  `;
  const session = sessions[0];

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.$executeRaw`DELETE FROM "Session" WHERE "id" = ${session.id}`;
    }
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return {
    email: session.email,
    id: session.userId,
    role: session.role,
  };
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (user?.role !== "ADMIN") {
    redirect("/interno/login");
  }

  return user;
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.$executeRaw`DELETE FROM "Session" WHERE "tokenHash" = ${hashToken(token)}`;
  }

  cookieStore.delete(SESSION_COOKIE);
}
