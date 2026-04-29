'use client';

import { useEffect, useState, useRef, useTransition, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { PlusCircle, Trash2, Edit, Upload, Check, X, Search, ChevronDown } from 'lucide-react';
import {
  getProductsAdmin,
  deleteProductAction,
  importProductsFromCSV,
  quickUpdateStockAction,
  quickUpdatePriceAction,
} from '@/app/actions/productActions';
import AddProductModal from '@/app/components/AddProductModal';

interface Product {
  id:          string;
  sku?:        string | null;
  name:        string;
  category:    string;
  price:       number;
  stock:       number;
  images:      string[];
  brand:       string;
  description: string;
  media?:      {
    id:         string;
    type:       'IMAGE' | 'VIDEO';
    url:        string;
    posterUrl:  string | null;
    sortOrder:  number;
  }[];
}

type StockFilter = 'all' | 'low' | 'out';

interface InlineEdit {
  id:    string;
  field: 'stock' | 'price';
  value: string;
}

const LOW_STOCK_THRESHOLD = 3;

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Agotado</span>;
  if (stock < LOW_STOCK_THRESHOLD)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">Bajo ({stock})</span>;
  return <span className="text-xs text-gray-600 tabular-nums">{stock}</span>;
}

export default function AdminProductsPage() {
  const [products, setProducts]           = useState<Product[]>([]);
  const [categories, setCategories]       = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImporting, startImportTr]      = useTransition();
  const [inlineEdit, setInlineEdit]       = useState<InlineEdit | null>(null);
  const [savingInline, startInlineTr]     = useTransition();
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const inlineInputRef                    = useRef<HTMLInputElement>(null);

  // Filtros avanzados
  const [stockFilter, setStockFilter]     = useState<StockFilter>('all');
  const [minPrice, setMinPrice]           = useState('');
  const [maxPrice, setMaxPrice]           = useState('');
  const [showFilters, setShowFilters]     = useState(false);

  const searchParams   = useSearchParams();
  const router         = useRouter();
  const pathname       = usePathname();
  const searchTerm     = searchParams.get('search')   ?? '';
  const categoryFilter = searchParams.get('category') ?? '';

  const loadProducts = useCallback(async () => {
    const { products: data, categories: cats } = await getProductsAdmin({
      search:      searchTerm     || undefined,
      category:    categoryFilter || undefined,
      minPrice:    minPrice ? parseFloat(minPrice) : undefined,
      maxPrice:    maxPrice ? parseFloat(maxPrice) : undefined,
      stockFilter,
      lowThreshold: LOW_STOCK_THRESHOLD,
    });
    setProducts(data as Product[]);
    setCategories(cats);
  }, [searchTerm, categoryFilter, minPrice, maxPrice, stockFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Foco automático en edición inline
  useEffect(() => {
    if (inlineEdit) inlineInputRef.current?.focus();
  }, [inlineEdit]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleEdit  = (p: Product) => { setEditingProduct(p); setIsModalOpen(true); };
  const handleClose = () => { setEditingProduct(null); setIsModalOpen(false); loadProducts(); };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    await deleteProductAction(id);
    loadProducts();
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange  = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      startImportTr(async () => {
        const res = await importProductsFromCSV(csv);
        alert(res.message);
        if (res.success) loadProducts();
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
    };
    reader.readAsText(file);
  };

  const startInlineEdit = (id: string, field: 'stock' | 'price', current: number) => {
    setInlineEdit({ id, field, value: current.toString() });
  };

  const cancelInlineEdit = () => setInlineEdit(null);

  const commitInlineEdit = () => {
    if (!inlineEdit) return;
    const { id, field, value } = inlineEdit;
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) { cancelInlineEdit(); return; }

    startInlineTr(async () => {
      if (field === 'stock') {
        await quickUpdateStockAction(id, Math.floor(parsed));
      } else {
        await quickUpdatePriceAction(id, parsed);
      }
      setProducts(prev =>
        prev.map(p => p.id === id ? { ...p, [field]: parsed } : p)
      );
      setInlineEdit(null);
    });
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitInlineEdit();
    if (e.key === 'Escape') cancelInlineEdit();
  };

  const lowStockCount = products.filter(p => p.stock > 0 && p.stock < LOW_STOCK_THRESHOLD).length;
  const outCount      = products.filter(p => p.stock === 0).length;

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
          <p className="text-xs text-gray-500 mt-0.5">{products.length} productos{lowStockCount > 0 && <span className="ml-2 text-orange-600 font-semibold">· {lowStockCount} bajo stock</span>}{outCount > 0 && <span className="ml-2 text-red-600 font-semibold">· {outCount} agotados</span>}</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv" />
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
          >
            <Upload size={14} />
            {isImporting ? 'Importando…' : 'CSV'}
          </button>
          <button
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-yellow border border-yellow-400 text-navy text-xs font-black uppercase tracking-wide rounded-lg hover:bg-yellow-300 transition"
          >
            <PlusCircle size={14} />
            Nuevo
          </button>
        </div>
      </div>

      {/* ── Barra de búsqueda + filtros ───────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl mb-3 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o marca…"
            defaultValue={searchTerm}
            onChange={e => setParam('search', e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
          <select
            value={categoryFilter}
            onChange={e => setParam('category', e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-gray-50 text-gray-600 focus:outline-none"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border transition ${showFilters ? 'bg-navy text-white border-navy' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
          >
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            Filtros
          </button>
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="px-3 py-3 flex flex-wrap gap-3 bg-gray-50 border-b border-gray-100">
            {/* Stock filter */}
            <div className="flex gap-1">
              {(['all', 'low', 'out'] as StockFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setStockFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                    stockFilter === f
                      ? f === 'out'   ? 'bg-red-600 text-white border-red-600'
                      : f === 'low'   ? 'bg-orange-500 text-white border-orange-500'
                      :                 'bg-navy text-white border-navy'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {f === 'all' ? 'Todo el stock' : f === 'low' ? `Bajo stock (<${LOW_STOCK_THRESHOLD})` : 'Agotados'}
                </button>
              ))}
            </div>
            {/* Rango de precio */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="font-medium">Precio</span>
              <input
                type="number" min="0" placeholder="Min"
                value={minPrice} onChange={e => setMinPrice(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-200 rounded-md bg-white text-xs"
              />
              <span>–</span>
              <input
                type="number" min="0" placeholder="Max"
                value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-200 rounded-md bg-white text-xs"
              />
              <span>USD</span>
              {(minPrice || maxPrice) && (
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Tabla densa ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 font-semibold text-gray-500 w-10"></th>
                <th className="px-3 py-2.5 font-semibold text-gray-500">Producto</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 hidden md:table-cell">SKU</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 hidden lg:table-cell">Categoría</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 text-right">Precio USD</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 text-right">Stock</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 w-16 text-center">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    No se encontraron productos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                products.map(product => {
                  const editingStock = inlineEdit?.id === product.id && inlineEdit.field === 'stock';
                  const editingPrice = inlineEdit?.id === product.id && inlineEdit.field === 'price';
                  const isEditing    = editingStock || editingPrice;

                  return (
                    <tr
                      key={product.id}
                      className={`group hover:bg-blue-50/30 transition-colors ${
                        product.stock === 0            ? 'bg-red-50/40' :
                        product.stock < LOW_STOCK_THRESHOLD ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      {/* Imagen */}
                      <td className="px-3 py-1.5">
                        <div className="w-8 h-8 rounded border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
                          <Image
                            src={product.images[0] || '/placeholder-product.png'}
                            alt={product.name}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      </td>

                      {/* Nombre + marca */}
                      <td className="px-3 py-1.5 max-w-[200px]">
                        <p className="font-medium text-gray-900 truncate leading-tight">{product.name}</p>
                        {product.brand && (
                          <p className="text-[10px] text-gray-400 truncate">{product.brand}</p>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="px-3 py-1.5 hidden md:table-cell">
                        {product.sku
                          ? <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{product.sku}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>

                      {/* Categoría */}
                      <td className="px-3 py-1.5 hidden lg:table-cell text-gray-500">{product.category}</td>

                      {/* Precio — inline edit */}
                      <td className="px-3 py-1.5 text-right">
                        {editingPrice ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-gray-400">$</span>
                            <input
                              ref={inlineInputRef}
                              type="number"
                              step="0.01"
                              min="0"
                              value={inlineEdit.value}
                              onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onKeyDown={handleInlineKeyDown}
                              onBlur={commitInlineEdit}
                              className="w-20 text-right border border-navy/40 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy/50 bg-white"
                            />
                          </div>
                        ) : (
                          <button
                            onDoubleClick={() => startInlineEdit(product.id, 'price', product.price)}
                            title="Doble clic para editar precio"
                            className="font-semibold text-green-700 tabular-nums hover:text-green-900 cursor-text group-hover:underline decoration-dashed"
                            disabled={savingInline && isEditing}
                          >
                            ${product.price.toFixed(2)}
                          </button>
                        )}
                      </td>

                      {/* Stock — inline edit */}
                      <td className="px-3 py-1.5 text-right">
                        {editingStock ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              ref={inlineInputRef}
                              type="number"
                              min="0"
                              step="1"
                              value={inlineEdit.value}
                              onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onKeyDown={handleInlineKeyDown}
                              onBlur={commitInlineEdit}
                              className="w-16 text-right border border-navy/40 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy/50 bg-white"
                            />
                            <button onClick={commitInlineEdit} disabled={savingInline} className="text-green-600 hover:text-green-800"><Check size={12} /></button>
                            <button onClick={cancelInlineEdit} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
                          </div>
                        ) : (
                          <button
                            onDoubleClick={() => startInlineEdit(product.id, 'stock', product.stock)}
                            title="Doble clic para editar stock"
                            className="cursor-text hover:opacity-80 group-hover:underline decoration-dashed"
                            disabled={savingInline && isEditing}
                          >
                            <StockBadge stock={product.stock} />
                          </button>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-navy hover:text-blue-700 transition"
                            title="Editar producto"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="text-gray-400 hover:text-red-600 transition"
                            title="Eliminar producto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con resumen */}
        {products.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{products.length} producto{products.length !== 1 ? 's' : ''}</span>
            <span className="text-[10px] text-gray-400">Doble clic en precio o stock para editar en línea</span>
          </div>
        )}
      </div>

      <AddProductModal isOpen={isModalOpen} onClose={handleClose} product={editingProduct} />
    </div>
  );
}
