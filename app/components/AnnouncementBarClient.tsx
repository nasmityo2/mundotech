'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

const COOKIE_KEY = 'mt_announcement_dismissed';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

/**
 * Wrapper cliente del AnnouncementBar. El contenido real (texto/enlace) llega
 * como `children` desde el Server Component padre, por lo que ya está en el
 * HTML inicial (visible para Googlebot).
 *
 * Dismiss: graba una cookie HTTP (legible en el servidor) para que en la
 * siguiente visita el servidor no renderice el bar → cero CLS para usuarios
 * que ya cerraron el aviso.
 *
 * Trade-off documentado (P87/H55):
 *   - Cookie vs localStorage: la cookie se lee en layout.tsx server-side.
 *     Si el usuario borra cookies, el aviso reaparece (comportamiento correcto).
 *   - Sin parpadeo ("flash"): el servidor ya excluye el bar si la cookie coincide
 *     con el texto actual, así que el cliente parte de dismissed=false cuando
 *     debe mostrar, y el bar se omite en SSR cuando ya fue cerrado.
 */
export default function AnnouncementBarClient({
  children,
  textKey,
  bgColor,
  textColor,
}: {
  children: React.ReactNode;
  textKey: string;
  bgColor: string;
  textColor: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  const dismiss = () => {
    try {
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(textKey)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    } catch {
      // no-op si cookies están bloqueadas
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className="relative w-full text-center text-[13px] sm:text-sm font-semibold px-10 py-2"
      style={{ backgroundColor: bgColor, color: textColor }}
      role="region"
      aria-label="Anuncio"
    >
      {children}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar anuncio"
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/10 active:bg-black/20"
        style={{ color: textColor }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
