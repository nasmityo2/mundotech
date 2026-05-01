/** URL pública usada en enlaces de correo (productos, cuenta, CTA). */
export function emailSiteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://jummper.pro';
}

export function emailContactAddress(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'ventas@jummper.pro';
}

/** Convierte rutas relativas en absolutas para clientes de correo. */
export function absoluteEmailUrl(pathOrUrl: string | null | undefined): string | null {
  const raw = pathOrUrl?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = emailSiteBaseUrl().replace(/\/$/, '');
  if (raw.startsWith('/')) return `${base}${raw}`;
  return `${base}/${raw}`;
}
