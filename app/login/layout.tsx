import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta MundoTech para pedidos, favoritos y checkout rápido.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
