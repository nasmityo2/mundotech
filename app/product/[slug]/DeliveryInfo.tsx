import { Store, Truck, Package, type LucideIcon } from 'lucide-react';
import { readSettings } from '@/lib/data-store';
import { readSiteContent } from '@/lib/site-content';

interface DeliveryRow {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: 'gratis' | 'según-destino';
}

export default async function DeliveryInfo() {
  const [settings, siteContent] = await Promise.all([readSettings(), readSiteContent()]);

  const storeTrust = siteContent.productTrust.find((t) => t.icon === 'store');
  const truckTrust = siteContent.productTrust.find((t) => t.icon === 'truck');

  const rows: DeliveryRow[] = [
    {
      icon: Store,
      title: 'Retiro en tienda',
      subtitle: settings.address || storeTrust?.sub || 'Carrera 21, Centro, Barquisimeto',
      badge: 'gratis',
    },
    {
      icon: Truck,
      title: truckTrust?.title ?? 'Delivery en Barquisimeto',
      subtitle: truckTrust?.sub ?? 'Entrega rápida en la ciudad',
      badge: 'gratis',
    },
    {
      icon: Package,
      title: 'Envíos a toda Venezuela',
      subtitle: 'Por MRW, Zoom y aliados',
      badge: 'según-destino',
    },
  ];

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border divide-y divide-border/70">
      {rows.map(({ icon: Icon, title, subtitle, badge }) => (
        <div key={title} className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-navy shadow-soft">
            <Icon size={16} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-tight text-navy">{title}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-on-light">{subtitle}</p>
          </div>
          {badge === 'gratis' ? (
            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              GRATIS
            </span>
          ) : (
            <span className="shrink-0 text-[11px] font-medium text-on-light">Según destino</span>
          )}
        </div>
      ))}
    </div>
  );
}
