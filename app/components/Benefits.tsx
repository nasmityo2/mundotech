import { Truck, ShieldCheck, Headset, CreditCard } from 'lucide-react';

export interface BenefitItem {
  title: string;
  sub:   string;
}

const ICON_LIST = [Truck, ShieldCheck, Headset, CreditCard];

// Datos reales de la operación — nada de claims genéricos intercambiables.
const DEFAULT_ITEMS: BenefitItem[] = [
  { title: 'Delivery en Barquisimeto en 24h',    sub: 'Y a todo el país por MRW o Zoom'        },
  { title: '12 meses de garantía directa',       sub: 'La gestionas con nosotros, sin vueltas' },
  { title: 'WhatsApp directo con el equipo',     sub: '0412-1471338 · te respondemos rápido'   },
  { title: 'Pago Móvil · Transferencia · Binance', sub: 'En bolívares o dólares, a tasa del día' },
];

const Benefits = ({ items }: { items?: BenefitItem[] }) => {
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <div className="bg-white border-b border-slate-100">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
        {list.map((item, i) => {
          const Icon = ICON_LIST[i % ICON_LIST.length];
          return (
            <div key={i} className="flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-yellowSft text-navy flex-shrink-0">
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-navy tracking-tight leading-tight">{item.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug hidden sm:block">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Benefits;
