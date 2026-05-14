import { logout } from "./actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button className="rounded-full border border-[#f8f4df]/25 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f8f4df] transition hover:border-[#bddf57] hover:text-[#bddf57]">
        Cerrar sesion
      </button>
    </form>
  );
}
