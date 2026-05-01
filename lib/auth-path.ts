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

function pathnameOnly(internalPath: string): string {
  const base = internalPath.split('?')[0] ?? internalPath;
  return base || '/';
}

/**
 * Destino tras login/registro. Los ADMIN siguen al panel por defecto, pero si venían de la tienda
 * (`callbackUrl` ≠ `/`), respetan ese destino (checkout, producto, carrito, cuenta, etc.).
 */
export function resolvePostLoginRedirect(
  role: string | undefined | null,
  rawCallbackUrl: string,
): string {
  const dest = safeInternalPath(rawCallbackUrl);
  const target = dest && dest !== '' ? dest : '/';
  const isAdmin = (role ?? '').toUpperCase() === 'ADMIN';

  if (!isAdmin) {
    return target;
  }

  const path = pathnameOnly(target);

  if (target === '/' || path === '/') {
    return '/admin/products';
  }

  if (path.startsWith('/admin')) {
    return target;
  }

  return target;
}
