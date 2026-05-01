import type { Metadata } from 'next';

import { verifyPasswordResetToken } from '@/app/actions/authActions';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Nueva contraseña',
  description: 'Establece una nueva contraseña para tu cuenta MundoTech.',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token: raw } = await searchParams;
  const token = typeof raw === 'string' ? raw.trim() : '';
  const initiallyValid = token.length > 0 ? await verifyPasswordResetToken(token) : false;

  return <ResetPasswordClient token={token} initiallyValid={initiallyValid} />;
}
