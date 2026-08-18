"use client";

type B2BContactActionsProps = {
  emailUrl: string;
  storeName: string;
  whatsappUrl: string | null;
};

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

export function B2BContactActions({ emailUrl, storeName, whatsappUrl }: B2BContactActionsProps) {
  function track(channel: "email" | "whatsapp") {
    window.umami?.track("b2b-contacto", { canal: channel, tienda: storeName });
  }

  return (
    <div className="mt-6 flex shrink-0 flex-col gap-2 sm:flex-row lg:mt-0 lg:flex-col">
      {whatsappUrl ? (
        <a
          className="rounded-full bg-[#17150f] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-[#c8ff52] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17150f]"
          href={whatsappUrl}
          onClick={() => track("whatsapp")}
          rel="noreferrer"
          target="_blank"
        >
          Coordinar por WhatsApp
        </a>
      ) : null}
      <a
        className="rounded-full border-2 border-[#17150f] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17150f]"
        href={emailUrl}
        onClick={() => track("email")}
      >
        Escribir por email
      </a>
    </div>
  );
}
