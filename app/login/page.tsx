import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{
    callbackUrl?: string;
    registration?: string;
    error?: string;
  }>;
};

/**
 * La autenticación vive en el modal integrado (`/?auth=login`).
 * Esta ruta conserva enlaces legacy y NextAuth `pages.signIn`.
 */
export default async function LoginPage({ searchParams }: Props) {
  const sp            = await searchParams;
  const callbackUrl = typeof sp.callbackUrl === 'string' ? sp.callbackUrl : '/';

  const q = new URLSearchParams();
  q.set('auth', 'login');
  q.set('callbackUrl', callbackUrl);
  if (sp.registration === 'success') q.set('registered', '1');

  redirect(`/?${q.toString()}`);
}
