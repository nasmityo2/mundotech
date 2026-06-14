import Image from 'next/image';
import Link from 'next/link';

export interface DiscoverBannerItem {
  id: string;
  imageUrl: string;
  title: string | null;
  link: string | null;
}

export default function DiscoverMosaic({ banners }: { banners: DiscoverBannerItem[] }) {
  if (!banners || banners.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-10">
      <h2 className="mb-3 sm:mb-4 text-lg sm:text-2xl font-black text-navy">Descubre</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {banners.map((b) => (
          <Link
            key={b.id}
            href={b.link || '/productos'}
            className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          >
            <Image
              src={b.imageUrl}
              alt={b.title || 'Descubre'}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
