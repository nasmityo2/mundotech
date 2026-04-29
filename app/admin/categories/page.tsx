'use client';

import { useEffect, useState, useMemo } from 'react';
import { getProducts } from '@/app/actions/productActions';
import { Tag, Package, ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  images: string[];
}

interface CategoryStat {
  name: string;
  productCount: number;
  totalStock: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(n);

export default function AdminCategoriesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    getProducts().then(({ products: data }) => {
      setProducts(data as Product[]);
      setLoading(false);
    });
  }, []);

  const categoryStats = useMemo((): CategoryStat[] => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const cat = p.category || 'Sin categoría';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries())
      .map(([name, prods]) => ({
        name,
        productCount: prods.length,
        totalStock: prods.reduce((s, p) => s + p.stock, 0),
        avgPrice: prods.reduce((s, p) => s + p.price, 0) / prods.length,
        minPrice: Math.min(...prods.map(p => p.price)),
        maxPrice: Math.max(...prods.map(p => p.price)),
      }))
      .sort((a, b) => b.productCount - a.productCount);
  }, [products]);

  const filteredCategories = useMemo(() =>
    categoryStats.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    ), [categoryStats, search]);

  const productsInSelected = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Tag size={22} className="text-navy" /> Categorías
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {loading ? '...' : `${categoryStats.length} categorías — ${products.length} productos`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listado de categorías */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No se encontraron categorías.</div>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredCategories.map(cat => (
                  <li key={cat.name}>
                    <button
                      onClick={() => setSelectedCategory(
                        selectedCategory === cat.name ? null : cat.name
                      )}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${
                        selectedCategory === cat.name ? 'bg-gray-100 border-l-4 border-brand-yellow' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`font-medium text-sm truncate ${selectedCategory === cat.name ? 'text-navy font-semibold' : 'text-gray-800'}`}>
                          {cat.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {cat.productCount} producto{cat.productCount !== 1 ? 's' : ''} · Stock: {cat.totalStock}
                        </p>
                      </div>
                      <ArrowRight size={14} className={`flex-shrink-0 ${selectedCategory === cat.name ? 'text-brand-yellow' : 'text-gray-300'}`} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Detalle de categoría seleccionada */}
        <div className="lg:col-span-2">
          {!selectedCategory ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl h-full flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <Tag size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">Selecciona una categoría para ver sus productos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats de la categoría */}
              {(() => {
                const cat = categoryStats.find(c => c.name === selectedCategory)!;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Productos', value: cat.productCount },
                      { label: 'Stock Total', value: cat.totalStock },
                      { label: 'Precio Mínimo', value: formatCurrency(cat.minPrice) },
                      { label: 'Precio Máximo', value: formatCurrency(cat.maxPrice) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Tabla de productos */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Package size={16} className="text-gray-400" />
                    Productos en &ldquo;{selectedCategory}&rdquo;
                  </h2>
                  <Link
                    href={`/admin/products?category=${encodeURIComponent(selectedCategory)}`}
                    className="text-xs text-navy font-semibold hover:underline"
                  >
                    Ver en inventario →
                  </Link>
                </div>
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Precio</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {productsInSelected.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{formatCurrency(p.price)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              p.stock === 0
                                ? 'bg-red-100 text-red-700'
                                : p.stock < 3
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {p.stock} uds.
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
