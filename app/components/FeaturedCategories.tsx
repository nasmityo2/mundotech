import Link from 'next/link';
import Image from 'next/image';
import {
  Laptop, Tv, Gamepad2, Refrigerator,
  Headphones, Camera, Watch, Printer, Wifi, Sparkles,
} from 'lucide-react';

export interface FeaturedCategory {
  id:       string;
  name:     string;
  slug:     string;
  imageUrl: string | null;
  order:    number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  laptops:           Laptop,
  televisores:       Tv,
  consolas:          Gamepad2,
  accesorios:        Sparkles,
  electrodomesticos: Refrigerator,
  audio:             Headphones,
  camaras:           Camera,
  wearables:         Watch,
  impresoras:        Printer,
  redes:             Wifi,
};

/** Fotografía producto HD — fondo neutro en UI (#F8F9FA en el círculo) */
const hi = (path: string, w = 1600) =>
  `https://images.unsplash.com/${path}?auto=format&fit=max&w=${w}&q=95`;

const ALL_CATEGORIES = [
  { id: 'all', name: 'Ver todo',          slug: '',               imageUrl: null, order: -1 },
  { id: '1',   name: 'Gadgets y accesorios', slug: 'accesorios',       imageUrl: hi('photo-1523275335684-37898b6baf30'), order: 0 },
  { id: '2',   name: 'Laptops',           slug: 'laptops',        imageUrl: hi('photo-1496181133206-80ce9b88a853'), order: 1 },
  { id: '3',   name: 'Televisores',       slug: 'televisores',    imageUrl: hi('photo-1593359677879-a4bb92f829e1'), order: 2 },
  { id: '4',   name: 'Consolas',          slug: 'consolas',       imageUrl: hi('photo-1612288532018-60aa10ad7d5f'), order: 3 },
  { id: '5',   name: 'Electrodomésticos', slug: 'electrodomesticos', imageUrl: hi('photo-1556909114-f6e7ad7d3136'), order: 4 },
  { id: '6',   name: 'Audio',             slug: 'audio',          imageUrl: hi('photo-1505740420928-5e560c06d30e'), order: 5 },
  { id: '7',   name: 'Cámaras',           slug: 'camaras',        imageUrl: hi('photo-1516035069371-29a1b244cc32'), order: 6 },
  { id: '8',   name: 'Wearables',         slug: 'wearables',      imageUrl: hi('photo-1523275335684-37898b6baf30'), order: 7 },
];

interface Props { categories?: FeaturedCategory[] }

const FeaturedCategories = ({ categories }: Props) => {
  const items = categories && categories.length > 0
    ? [ALL_CATEGORIES[0], ...categories]
    : ALL_CATEGORIES;

  return (
    <section className="bg-white border-b border-slate-200">
      <div className="py-5">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {items.map((cat) => {
            const slugKey = cat.slug.toLowerCase().replace(/\s/g, '');
            const Icon = ICON_MAP[slugKey];
            const href = cat.slug ? `/productos?cat=${encodeURIComponent(cat.name)}` : '/productos';

            return (
              <Link
                key={cat.id}
                href={href}
                className="group flex flex-col items-center gap-2 px-3 sm:px-4 py-2 flex-shrink-0 min-w-[72px] sm:min-w-[80px]"
              >
                <div className="w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-full overflow-hidden border border-slate-200 group-hover:border-[#FFD700] transition-colors bg-[#F8F9FA] relative flex-shrink-0">
                  {cat.imageUrl ? (
                    <Image
                      src={cat.imageUrl}
                      alt={cat.name}
                      fill
                      sizes="68px"
                      quality={95}
                      className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : Icon ? (
                    <div className="w-full h-full flex items-center justify-center bg-[#111827]">
                      <Icon size={26} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-[#F8F9FA]" />
                  )}
                </div>

                <span className="text-[11px] sm:text-[12px] font-medium text-[#0f172a] text-center leading-tight whitespace-nowrap">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
