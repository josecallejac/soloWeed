import Link from "next/link";
import { redirect } from "next/navigation";
import { createSession, getCurrentUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const params = (await searchParams) ?? {};

  if (user?.role === "ADMIN") {
    redirect("/interno/reportes");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1e8] px-5 py-10 text-[#17150f]">
      <section className="w-full max-w-md rounded-[2rem] bg-[#17150f] p-6 text-[#f8f4df] shadow-[10px_10px_0_#bddf57]">
        <Link className="text-sm font-black uppercase tracking-[0.2em] text-[#bddf57]" href="/">
          SoloWeed
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">Ingreso interno</h1>
        <p className="mt-3 text-sm leading-6 text-[#f8f4df]/70">Acceso solo para usuarios ADMIN.</p>

        {params.error ? <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">Email o password incorrectos.</p> : null}

        <form action={login} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Email
            <input className="rounded-2xl border border-white/10 bg-[#f8f4df] px-4 py-3 text-[#17150f]" name="email" required type="email" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Password
            <input className="rounded-2xl border border-white/10 bg-[#f8f4df] px-4 py-3 text-[#17150f]" name="password" required type="password" />
          </label>
          <button className="mt-2 rounded-full bg-[#bddf57] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#17150f] shadow-[5px_5px_0_#000] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_#000]">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}

type LoginUserRow = {
  id: number;
  passwordHash: string;
  role: string;
};

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const users = await prisma.$queryRaw<LoginUserRow[]>`
    SELECT "id", "passwordHash", "role" FROM "User" WHERE "email" = ${email} LIMIT 1
  `;
  const user = users[0];

  if (!user || user.role !== "ADMIN" || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/interno/login?error=1");
  }

  await createSession(user.id);
  redirect("/interno/reportes");
}
