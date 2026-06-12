/**
 * AnnouncementBar — Server Component (P87/H55)
 *
 * El contenido (texto y enlace) se resuelve en servidor y aparece en el HTML
 * inicial: Googlebot lo ve sin ejecutar JS. El dismiss interactivo se delega
 * a AnnouncementBarClient (cookie HTTP, sin flash ni CLS).
 *
 * Flujo:
 *  1. layout.tsx llama readAnnouncement() + lee cookie mt_announcement_dismissed.
 *  2. Si active=false o texto vacío → no renderiza nada.
 *  3. Si la cookie coincide con el texto actual → no renderiza nada (usuario ya cerró).
 *  4. En cualquier otro caso → renderiza markup con contenido real en SSR.
 */
import Link from 'next/link';
import type { Announcement } from '@/lib/announcement';
import { isInternalPath, isSafeEditableLink } from '@/lib/safe-link';
import AnnouncementBarClient from './AnnouncementBarClient';

export default function AnnouncementBar({
  data,
  dismissedText,
}: {
  data: Announcement;
  dismissedText?: string;
}) {
  if (!data.active || !data.text.trim()) return null;

  const text = data.text.trim();

  // Si la cookie de dismissal coincide con el texto vigente, el servidor omite el
  // render por completo: el usuario no ve parpadeo y no hay CLS.
  if (dismissedText === text) return null;

  const link = data.link.trim();

  // PRD-283: defensa en el sink — además del schema Zod, el render solo enlaza
  // rutas internas o https. Cualquier otro valor se muestra como texto plano.
  let inner: React.ReactNode;
  if (link && isInternalPath(link)) {
    inner = (
      <Link href={link} className="underline-offset-2 hover:underline">
        {text}
      </Link>
    );
  } else if (link && isSafeEditableLink(link)) {
    inner = (
      <a href={link} rel="noopener noreferrer" className="underline-offset-2 hover:underline">
        {text}
      </a>
    );
  } else {
    inner = <span>{text}</span>;
  }

  return (
    <AnnouncementBarClient
      textKey={text}
      bgColor={data.bgColor}
      textColor={data.textColor}
    >
      {inner}
    </AnnouncementBarClient>
  );
}
