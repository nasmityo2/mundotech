import Link from 'next/link';
import {
  MapPin, Phone, Mail, ShieldCheck,
  Truck, CreditCard, Headset, ArrowRight,
} from 'lucide-react';
import { FacebookIcon, InstagramIcon } from '@/components/icons/BrandSocialIcons';
import { MUNDOTECH_SOCIAL } from '@/lib/mundotech-social';

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const Footer = () => {
  return (
    <footer className="mt-12 sm:mt-20 bg-navy text-white w-full max-w-full overflow-x-hidden">
      <div className="h-[2px] bg-brand-yellow" />

      {/* Trust strip */}
      <div className="border-b border-white/10 bg-navy-700/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: ShieldCheck, title: 'Garantía oficial', sub: 'Productos originales' },
              { icon: Truck,       title: 'Envío seguro',     sub: 'Entrega trackeable' },
              { icon: CreditCard,  title: 'Pago verificado',  sub: 'Múltiples métodos' },
              { icon: Headset,     title: 'Soporte real',     sub: 'Atención humana' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-yellow flex-shrink-0">
                  <item.icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{item.title}</p>
                  <p className="text-[11px] text-white/55 truncate">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10">

          {/* Marca */}
          <div className="md:col-span-4">
            <p className="text-2xl font-bold tracking-tight mb-3 flex items-center gap-1">
              <span>Mundo</span>
              <span className="text-brand-yellow">Tech</span>
            </p>
            <p className="text-sm text-white/60 leading-relaxed max-w-md">
              MundoTech: tecnología y gadgets en Barquisimeto. Envío seguro, garantía oficial y soporte real.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={MUNDOTECH_SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#FFD700] transition-all duration-300 hover:scale-105 hover:border-[#FFD700]/45 hover:ring-1 hover:ring-[#FFD700]/35"
                aria-label="Instagram MundoTech"
              >
                <InstagramIcon size={18} />
              </Link>
              <Link
                href={MUNDOTECH_SOCIAL.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#FFD700] transition-all duration-300 hover:scale-105 hover:border-[#FFD700]/45 hover:ring-1 hover:ring-[#FFD700]/35"
                aria-label="Facebook MundoTech"
              >
                <FacebookIcon size={18} />
              </Link>
              <Link
                href={MUNDOTECH_SOCIAL.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#25D366] transition-all duration-300 hover:scale-105 hover:border-[#25D366]/45 hover:ring-1 hover:ring-[#25D366]/35"
                aria-label="WhatsApp MundoTech"
              >
                <WhatsAppGlyph className="h-[18px] w-[18px]" />
              </Link>
            </div>
            <div className="mt-5 space-y-2 text-sm text-white/65">
              <div className="flex items-start gap-2.5">
                <MapPin size={13} className="text-brand-yellow flex-shrink-0 mt-0.5" />
                <span>C.C. Minicentro 34, Calle 22, Barquisimeto, Lara</span>
              </div>
              <div className="flex items-center gap-2.5"><Phone size={13} className="text-brand-yellow" /> 0412-1471338 · 0414-5709470</div>
              <div className="flex items-center gap-2.5"><Mail size={13} className="text-brand-yellow" /> ventas@mundotech.com.ve</div>
            </div>
          </div>

          {/* Tienda */}
          <div className="md:col-span-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-4">Tienda</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              {[
                { href: '/',          label: 'Inicio'      },
                { href: '/productos', label: 'Catálogo'    },
                { href: '/wishlist',  label: 'Favoritos'   },
                { href: '/cart',      label: 'Carrito'     },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-brand-yellow transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Soporte */}
          <div className="md:col-span-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-4">Soporte</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              {[
                { href: '/account/orders',  label: 'Mis pedidos' },
                { href: '/account/details', label: 'Mi cuenta'   },
                { href: '#',                label: 'Garantía'    },
                { href: '#',                label: 'Devoluciones' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-brand-yellow transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter + Pagos */}
          <div className="md:col-span-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-4">
              Recibe ofertas exclusivas
            </h4>
            <form className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-brand-yellow/40 transition-colors min-w-0">
              <input
                type="email"
                placeholder="tu@email.com"
                className="flex-1 min-w-0 bg-transparent px-3 sm:px-4 min-h-[48px] text-base text-white placeholder:text-white/40 outline-none"
              />
              <button
                type="submit"
                className="m-1 inline-flex items-center gap-1 rounded-xl bg-brand-yellow px-3 sm:px-4 text-sm font-semibold text-navy transition-all duration-300 min-h-[40px] hover:bg-[#FFE03A] active:scale-95 flex-shrink-0"
              >
                <span className="hidden xs:inline">Suscribirme</span>
                <ArrowRight size={14} />
              </button>
            </form>
            <p className="mt-2.5 text-[11px] text-white/40">
              Sin spam. Cancela cuando quieras.
            </p>

            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 mt-7 mb-3">
              Métodos de pago
            </h4>
            <div className="flex flex-wrap gap-2">
              {['Pago Móvil', 'Transferencia', 'Binance', 'Cashea', 'Efectivo'].map(m => (
                <span
                  key={m}
                  className="px-3 h-8 inline-flex items-center bg-white/5 border border-white/10 rounded-xl text-[11px] font-medium text-white/75"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-white/45">
          <p>© {new Date().getFullYear()} MundoTech — Barquisimeto, Venezuela. Todos los derechos reservados.</p>
          <div className="flex items-center gap-5">
            <Link href="#" className="hover:text-brand-yellow transition-colors">Términos</Link>
            <Link href="#" className="hover:text-brand-yellow transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-brand-yellow transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
