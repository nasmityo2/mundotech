import Link from 'next/link';
import { Share2, Globe, Phone, MapPin, Mail } from 'lucide-react';
import { readSettings } from '@/lib/data-store';

const Footer = async () => {
  const settings = await readSettings();

  return (
    <footer className="bg-[#0B0B0B] text-white mt-12 border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div>
            <h3 className="text-xl font-black tracking-tight mb-1">
              {settings.storeName.includes('Tech') ? (
                <>
                  {settings.storeName.replace('Tech', '')}<span className="text-brand-yellow">Tech</span>
                </>
              ) : (
                <span>{settings.storeName}</span>
              )}
            </h3>
            {settings.tagline && (
              <p className="text-gray-400 text-sm leading-relaxed mt-2">
                {settings.tagline}
              </p>
            )}
            <div className="mt-4 space-y-2">
              {settings.address && (
                <div className="flex items-start gap-2 text-[13px] text-gray-400">
                  <MapPin size={13} className="text-brand-yellow flex-shrink-0 mt-0.5" />
                  <span>{settings.address}</span>
                </div>
              )}
              {settings.phone && (
                <a
                  href={`tel:+58${settings.phone.replace(/^0/, '').replace(/[-\s]/g, '')}`}
                  className="flex items-center gap-2 text-[13px] text-gray-400 hover:text-brand-yellow transition-colors"
                >
                  <Phone size={13} className="text-brand-yellow flex-shrink-0" />
                  {settings.phone}
                </a>
              )}
              {settings.phone2 && (
                <a
                  href={`tel:+58${settings.phone2.replace(/^0/, '').replace(/[-\s]/g, '')}`}
                  className="flex items-center gap-2 text-[13px] text-gray-400 hover:text-brand-yellow transition-colors"
                >
                  <Phone size={13} className="text-brand-yellow flex-shrink-0" />
                  {settings.phone2}
                </a>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300 mb-4">Tienda</h3>
            <ul className="space-y-2">
              <li><Link href="/"           className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Inicio</Link></li>
              <li><Link href="/productos"  className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Catálogo</Link></li>
              <li><Link href="/productos?cat=Consolas"    className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Gaming</Link></li>
              <li><Link href="/productos?cat=Smartphones" className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Smartphones</Link></li>
              <li><Link href="/productos?cat=Accesorios"  className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Accesorios</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300 mb-4">Soporte</h3>
            <ul className="space-y-2">
              <li><Link href="/account/orders"   className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Mis pedidos</Link></li>
              <li><Link href="/checkout"         className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Checkout</Link></li>
              <li><Link href="/privacy-policy"   className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Privacidad</Link></li>
              <li><Link href="/terms-of-service" className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Términos</Link></li>
              <li><Link href="/shipping-policy"  className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Envíos</Link></li>
            </ul>
          </div>

          {/* Social + Payments */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300 mb-4">Síguenos</h3>
            <div className="flex gap-3 mb-6">
              {settings.instagram ? (
                <a href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-brand-yellow hover:text-navy text-gray-400 transition-all">
                  <Share2 size={16} />
                </a>
              ) : (
                <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-gray-600">
                  <Share2 size={16} />
                </span>
              )}
              {settings.facebook ? (
                <a href={settings.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-brand-yellow hover:text-navy text-gray-400 transition-all">
                  <Globe size={16} />
                </a>
              ) : (
                <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-gray-600">
                  <Globe size={16} />
                </span>
              )}
              <a href={`mailto:${settings.email}`} aria-label="Email"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-brand-yellow hover:text-navy text-gray-400 transition-all">
                <Mail size={16} />
              </a>
            </div>

            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300 mb-3">Métodos de Pago</h3>
            <div className="flex flex-wrap gap-2">
              {['Pago Móvil', 'Transferencia', 'Zelle', 'Efectivo'].map(m => (
                <span key={m} className="bg-white/5 border border-white/10 text-[11px] font-semibold px-2.5 py-1 rounded-md text-gray-300">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-600 text-[12px]">
          <p>&copy; {new Date().getFullYear()} {settings.storeName} · Barquisimeto, Venezuela</p>
          <p>Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
