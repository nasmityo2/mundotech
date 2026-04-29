import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ChevronRight, Eye } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import CartClient from './CartClient';
import RecentlyViewed from '@/components/RecentlyViewed';

export const dynamic = 'force-dynamic';

async function getRecommendedProducts() {
  return prisma.product.findMany({
    where: { stock: { gt: 0 } },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
}

export default async function CartPage() {
  const recommended = await getRecommendedProducts();

  return (
    <div className="pb-10 sm:pb-12 w-full max-w-full">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mb-4 sm:mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-navy transition-colors">Inicio</Link>
        <ChevronRight size={12} />
        <span className="text-navy font-medium">Carrito</span>
      </nav>

      <CartClient />

      {/* Recomendados */}
      {recommended.length > 0 && (
        <div className="mt-10 sm:mt-14">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Eye size={18} className="text-slate-400" />
            <h2 className="text-[1.3rem] sm:text-2xl md:text-[1.75rem] font-bold text-navy tracking-tight">
              También te puede interesar
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {recommended.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  image: product.images[0] || '/placeholder-product.png',
                  description: product.description || '',
                  details: {},
                } as any}
              />
            ))}
          </div>
        </div>
      )}

      {/* Vistos recientemente */}
      <RecentlyViewed limit={6} />
    </div>
  );
}
