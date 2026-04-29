import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export interface PromoItem {
  id: string;
  title: string;
  subtitle: string | null;
  discountText: string | null;
  imageUrl: string | null;
  bgColor: string;
  link: string;
}

interface Props {
  promotions?: PromoItem[];
}

const promoImg = (path: string) =>
  `https://images.unsplash.com/${path}?auto=format&fit=max&w=1200&q=90`;

/** Siempre 3 ideas distintas MundoTech — rellenan huecos cuando en admin hay 1–2 promos */
const FALLBACK_PROMOS = [
  {
    label: 'Gaming & retro',
    title: 'Consolas portátiles\ny handheld',
    subtitle: 'R36S y más — envío seguro',
    cta: 'Ver gaming',
    href: '/productos?cat=Consolas',
    img: promoImg('photo-1612288532018-60aa10ad7d5f'),
  },
  {
    label: 'Smartphones',
    title: 'Últimos equipos\ny accesorios',
    subtitle: 'Garantía y stock verificado',
    cta: 'Ver smartphones',
    href: '/productos?cat=Smartphones',
    img: promoImg('photo-1592899677979-966312976a8a'),
  },
  {
    label: 'Belleza tech',
    title: 'Moldeadores\ny cuidado personal',
    subtitle: 'Marcas que ya conoces',
    cta: 'Ver belleza',
    href: '/productos?cat=Belleza',
    img: promoImg('photo-1522338242992-e1a54906a8da'),
  },
] as const;

type Box = {
  label: string;
  title: string;
  subtitle: string | null;
  cta: string;
  href: string;
  img: string;
};

function normalizeLabel(
  discountText: string | null | undefined,
  title: string
): string {
  const d = discountText?.trim();
  if (!d) return '';
  const t = title.replace(/\s+/g, ' ').trim().toLowerCase();
  const normalized = d.toLowerCase();
  if (t.includes(normalized) || normalized.length <= 2) return '';
  return d;
}

/** Combina promos de DB con fallbacks para que nunca falten 3 tarjetas (evita columnas vacías). */
function buildBoxes(promotions: PromoItem[] | undefined): Box[] {
  const fromDb = promotions?.filter(Boolean).slice(0, 3) ?? [];
  const out: Box[] = [];

  for (let i = 0; i < 3; i++) {
    const p = fromDb[i];
    const fb = FALLBACK_PROMOS[i];

    if (p) {
      const discountLine = normalizeLabel(p.discountText, p.title);
      out.push({
        label: discountLine || 'MundoTech · Promo',
        title: p.title?.trim() || fb.title,
        subtitle: p.subtitle?.trim() ?? null,
        cta: 'Ver ofertas',
        href: p.link || fb.href,
        img: p.imageUrl || fb.img,
      });
    } else {
      out.push({
        label: fb.label,
        title: fb.title,
        subtitle: fb.subtitle,
        cta: fb.cta,
        href: fb.href,
        img: fb.img,
      });
    }
  }

  return out;
}

const PromoOverlay = () => (
  <>
    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/80 to-[#0B0B0B]/45" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#FFD700]/5 via-transparent to-cyan-500/5" />
  </>
);

const Promotions = ({ promotions }: Props) => {
  const boxes = buildBoxes(
    promotions && promotions.length >= 1 ? promotions : undefined
  );

  return (
    <section className="relative py-5 sm:py-8 w-full max-w-full">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {boxes.map((box, i) => (
          <Link
            key={`${box.href}-${i}`}
            href={box.href}
            className="group relative flex h-[180px] xs:h-[200px] sm:h-[260px] flex-col justify-end overflow-hidden rounded-2xl border border-slate-200/90 bg-[#111827] shadow-sm transition-all duration-300 active:scale-[0.99] hover:border-[#FFD700]/35 hover:shadow-xl"
          >
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={box.img}
                alt={box.title.replace(/\n/g, ' ')}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                quality={92}
                className="object-cover opacity-55 transition-[opacity,transform] duration-500 group-hover:scale-[1.04] group-hover:opacity-65"
              />
              <PromoOverlay />
            </div>

            <div className="pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full bg-[#FFD700]/20 blur-2xl sm:right-5 sm:top-5" />
            <div className="pointer-events-none absolute bottom-8 left-4 h-16 w-16 rounded-full border border-[#FFD700]/20 sm:left-5" />

            <div className="relative z-10 p-5">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#FFD700]">
                {box.label}
              </span>
              <h3 className="text-[18px] font-bold leading-tight text-white whitespace-pre-line sm:text-[19px]">
                {box.title}
              </h3>
              {box.subtitle ? (
                <p className="mt-1.5 line-clamp-2 text-[12px] font-medium text-white/75">
                  {box.subtitle}
                </p>
              ) : null}
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#F3F4F6] transition-colors group-hover:text-white">
                {box.cta}{' '}
                <ArrowRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Promotions;
