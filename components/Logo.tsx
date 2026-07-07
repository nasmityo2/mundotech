import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type LogoVariant = 'light' | 'dark' | 'auto';

const SRC = '/logo-light.png';

const SIZES = {
  sm: { width: 120, height: 30, className: 'h-7 w-auto' },
  md: { width: 148, height: 36, className: 'h-9 w-auto sm:h-10' },
  lg: { width: 180, height: 44, className: 'h-11 w-auto' },
} as const;

export interface LogoProps {
  /** light = fondo claro · dark = fondo navy · auto = hereda data-logo-surface del contenedor */
  variant?: LogoVariant;
  size?: keyof typeof SIZES;
  className?: string;
  /** false = sin enlace a inicio */
  href?: string | false;
  priority?: boolean;
}

/**
 * Logo de marca MundoTech. Usar variant="light" en navbar/fondos blancos
 * y variant="dark" en bandas navy (footer, auth, hero).
 */
export default function Logo({
  variant: _variant,
  size = 'md',
  className,
  href = '/',
  priority = false,
}: LogoProps) {
  const dims = SIZES[size];

  const img = (extra?: string) => (
    <Image
      src={SRC}
      alt="MundoTech — Conectados Contigo"
      width={dims.width}
      height={dims.height}
      priority={priority}
      className={cn(dims.className, extra, className)}
    />
  );

  if (href === false) {
    return <span className="inline-flex items-center">{img()}</span>;
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 rounded-lg"
      aria-label="MundoTech — Ir al inicio"
    >
      {img()}
    </Link>
  );
}
