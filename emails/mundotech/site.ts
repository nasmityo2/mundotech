/** URL pública usada en enlaces de correo (productos, cuenta, CTA). */
export function emailSiteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://mundotechve.com';
}

export function emailContactAddress(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'ventas@mundotechve.com';
}

/** Datos verificables de la tienda física (overrideables por env). */
export function emailStoreAddress(): string {
  return (
    process.env.NEXT_PUBLIC_STORE_ADDRESS?.trim() ||
    'Carrera 21 con esquina calle 21, Centro, Barquisimeto 3001, estado Lara'
  );
}

export function emailStorePhones(): string {
  return process.env.NEXT_PUBLIC_CONTACT_PHONES?.trim() || '0412-1471338 · 0414-5709470';
}

export function emailInstagramHandle(): string {
  return process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE?.trim() || '@Mundotech39';
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
