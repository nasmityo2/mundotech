/** Normaliza callbackUrl para evitar open redirects fuera del mismo origin. */
export function safeInternalPath(raw: string): string {
  try {
    const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (typeof window !== 'undefined' && u.origin !== window.location.origin) return '/';
    return `${u.pathname}${u.search}`;
  } catch {
    return '/';
  }
}
