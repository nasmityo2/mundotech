/**
 * FASE 3 (SEO): IndexNow — notificación instantánea a Bing/Yandex/Seznam (y
 * agregadores) cuando cambia una URL. Google no usa IndexNow pero el sitemap
 * dinámico ya cubre su descubrimiento.
 *
 * No-op total sin INDEXNOW_KEY. La clave se sirve en /indexnow.txt
 * (app/indexnow.txt/route.ts) y se referencia vía keyLocation.
 *
 * Best-effort: jamás lanza — un fallo de red no debe afectar la mutación
 * de catálogo que lo disparó.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotechve.com';

export async function pingIndexNow(paths: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || paths.length === 0) return;

  try {
    const base = SITE_URL.replace(/\/$/, '');
    const host = new URL(base).host;
    const urlList = [...new Set(paths)]
      .slice(0, 100)
      .map((p) => (p.startsWith('http') ? p : `${base}${p.startsWith('/') ? '' : '/'}${p}`));

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${base}/indexnow.txt`,
        urlList,
      }),
      // El ping no debe colgar la server action que lo dispara.
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok && res.status !== 202) {
      console.warn('[indexnow] respuesta no OK:', res.status);
    }
  } catch (err) {
    console.warn('[indexnow] ping falló (no crítico):', err instanceof Error ? err.message : err);
  }
}
