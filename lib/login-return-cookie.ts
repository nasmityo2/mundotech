import { cookies } from 'next/headers';

import {
  LOGIN_RETURN_COOKIE_NAME,
  loginReturnCookieOptions,
} from '@/lib/login-return-cookie-shared';
import {
  pathnameToLoginNextSlug,
  pathFromLoginNextSlug,
} from '@/lib/auth-path';

/**
 * Lee cookie de retorno tras login (una sola vez) y borra estado.
 */
export async function readAndConsumeLoginReturnCookiePath(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(LOGIN_RETURN_COOKIE_NAME)?.value ?? null;
  jar.delete(LOGIN_RETURN_COOKIE_NAME);
  if (!raw) return null;
  return pathFromLoginNextSlug(raw);
}

/** Antes de `redirect('/login')` desde un Server Component. */
export async function primeLoginRedirectFromInternalPath(
  pathname: string,
): Promise<void> {
  const slug = pathnameToLoginNextSlug(pathname);
  if (!slug) return;
  const jar = await cookies();
  jar.set(LOGIN_RETURN_COOKIE_NAME, slug, loginReturnCookieOptions());
}
