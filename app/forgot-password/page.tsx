import type { Metadata } from 'next';
import ForgotPasswordClient from './ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  description:
    'Solicita un enlace para restablecer tu contraseña en MundoTech. El enlace es válido por 15 minutos.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
