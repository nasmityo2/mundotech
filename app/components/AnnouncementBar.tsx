'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Announcement } from '@/lib/announcement';

/**
 * Barra de anuncios superior. Descartable por el usuario (recordado en
 * localStorage por contenido: si el admin cambia el texto, reaparece).
 */
export default function AnnouncementBar({ data }: { data: Announcement }) {
  const [hidden, setHidden] = useState(true);

  const storageKey = 'mt_announcement_dismissed';

  useEffect(() => {
    if (!data.active || !data.text.trim()) {
      setHidden(true);
      return;
    }
    try {
      const dismissed = window.localStorage.getItem(storageKey);
      setHidden(dismissed === data.text.trim());
    } catch {
      setHidden(false);
    }
  }, [data.active, data.text]);

  if (!data.active || !data.text.trim() || hidden) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey, data.text.trim());
    } catch { /* no-op */ }
    setHidden(true);
  };

  const text = data.text.trim();
  const inner = data.link.trim() ? (
    <Link href={data.link.trim()} className="underline-offset-2 hover:underline">
      {text}
    </Link>
  ) : (
    <span>{text}</span>
  );

  return (
    <div
      className="relative w-full text-center text-[13px] sm:text-sm font-semibold px-10 py-2"
      style={{ backgroundColor: data.bgColor, color: data.textColor }}
      role="region"
      aria-label="Anuncio"
    >
      {inner}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar anuncio"
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/10 active:bg-black/20"
        style={{ color: data.textColor }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
