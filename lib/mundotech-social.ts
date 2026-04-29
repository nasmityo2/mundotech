/** URLs oficiales — sobreescribe con NEXT_PUBLIC_* en .env.local */

export const MUNDOTECH_SOCIAL = {
  instagram:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? 'https://www.instagram.com/',
  facebook:
    process.env.NEXT_PUBLIC_FACEBOOK_URL ?? 'https://www.facebook.com/',
  /** wa.me con código país sin + (ej. 584121471338) */
  whatsapp:
    process.env.NEXT_PUBLIC_WHATSAPP_URL ??
    'https://wa.me/584121471338',
} as const;
