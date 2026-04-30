import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso',
  description: 'Inicia sesión o crea tu cuenta en MundoTech.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
