'use client';

import { useEffect, useState, useRef, useTransition, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { PlusCircle, Trash2, Edit, Upload, Download, Check, X, Search, ChevronDown } from 'lucide-react';
import {
  getProductsAdmin,
  deleteProductAction,
  importProductsFromCSV,
  quickUpdateStockAction,
  quickUpdatePriceAction,
} from '@/app/actions/productActions';
import AddProductModal from '@/app/components/AddProductModal';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { TouchIconButton } from '@/components/admin/TouchIconButton';
import { downloadCsv, csvDateStamp } from '@/lib/csv-export';

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
  specs?:      unknown | null;
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
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Agotado</span>;
  if (stock < LOW_STOCK_THRESHOLD)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">Bajo · {stock}</span>;
  return <span className="text-sm font-semibold text-gray-700 tabular-nums">{stock}</span>;
}

function AdminProductsContent() {
  const [products, setProducts]           = useState<Product[]>([]);
  const [categories, setCategories]       = useState<string[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImporting, startImportTr]      = useTransition();
  const [inlineEdit, setInlineEdit]       = useState<InlineEdit | null>(null);
  const [savingInline, startInlineTr]     = useTransition();
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const inlineInputRef                    = useRef<HTMLInputElement>(null);

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
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, minPrice, maxPrice, stockFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Aplica el filtro de stock recibido por query (?stock=low|out), p. ej. desde
  // el enlace «stock bajo» del dashboard. Solo en el montaje inicial para no
  // sobrescribir el filtro que el operador elija después.
  const stockParamApplied = useRef(false);
  useEffect(() => {
    if (stockParamApplied.current) return;
    stockParamApplied.current = true;
    const s = searchParams.get('stock');
    if (s === 'low' || s === 'out') setStockFilter(s);
  }, [searchParams]);

  useEffect(() => {
    if (inlineEdit) inlineInputRef.current?.focus();
  }, [inlineEdit]);

  const handleExportCsv = useCallback(() => {
    const rows = products.map(p => ({
      SKU: p.sku ?? '',
      Nombre: p.name,
      Marca: p.brand,
      Categoría: p.category,
      'Precio USD': p.price,
      Stock: p.stock,
      Estado: p.stock === 0 ? 'Agotado' : p.stock < LOW_STOCK_THRESHOLD ? 'Bajo' : 'Disponible',
    }));
    downloadCsv(`inventario-mundotech-${csvDateStamp()}.csv`, rows);
  }, [products]);

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
      setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: parsed } : p));
      setInlineEdit(null);
    });
  };
  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitInlineEdit();
    if (e.key === 'Escape') cancelInlineEdit();
  };

  const lowStockCount = products.filter(p => p.stock > 0 && p.stock < LOW_STOCK_THRESHOLD).length;
  const outCount      = products.filter(p => p.stock === 0).length;

  const renderPriceCell = (p: Product) => {
    const isEditing = inlineEdit?.id === p.id && inlineEdit.field === 'price';
    if (isEditing) {
      return (
        <span className="inline-flex items-center gap-1">
          <span className="text-gray-400">$</span>
          <input
            ref={inlineInputRef}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={inlineEdit.value}
            onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
            onKeyDown={handleInlineKeyDown}
            onBlur={commitInlineEdit}
            className="w-24 text-right border border-navy/40 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-navy/50 bg-white"
          />
        </span>
      );
    }
    return (
      <button
        onDoubleClick={() => startInlineEdit(p.id, 'price', p.price)}
        onClick={(e) => { if (window.matchMedia('(hover: none)').matches) { e.preventDefault(); startInlineEdit(p.id, 'price', p.price); } }}
        title="Doble clic (PC) o tap (celular) para editar"
        className="font-semibold text-green-700 tabular-nums text-sm"
      >
        ${p.price.toFixed(2)}
      </button>
    );
  };

  const renderStockCell = (p: Product) => {
    const isEditing = inlineEdit?.id === p.id && inlineEdit.field === 'stock';
    if (isEditing) {
      return (
        <span className="inline-flex items-center gap-1">
          <input
            ref={inlineInputRef}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={inlineEdit.value}
            onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
            onKeyDown={handleInlineKeyDown}
            onBlur={commitInlineEdit}
            className="w-16 text-right border border-navy/40 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-navy/50 bg-white"
          />
          <button onClick={commitInlineEdit} disabled={savingInline} className="text-green-600"><Check size={14} /></button>
          <button onClick={cancelInlineEdit} className="text-gray-400"><X size={14} /></button>
        </span>
      );
    }
    return (
      <button
        onDoubleClick={() => startInlineEdit(p.id, 'stock', p.stock)}
        onClick={(e) => { if (window.matchMedia('(hover: none)').matches) { e.preventDefault(); startInlineEdit(p.id, 'stock', p.stock); } }}
        title="Doble clic (PC) o tap (celular) para editar"
      >
        <StockBadge stock={p.stock} />
      </button>
    );
  };

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Producto',
      primary: true,
      cell: p => (
        <span className="block truncate">
          {p.name}
          {p.brand && <span className="text-gray-400 font-normal text-xs ml-1">· {p.brand}</span>}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      mobileLabel: 'SKU',
      cell: p => p.sku
        ? <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p.sku}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: 'category',
      header: 'Categoría',
      mobileLabel: 'Categoría',
      cell: p => <span className="text-sm text-gray-600 truncate">{p.category}</span>,
    },
    {
      key: 'price',
      header: 'Precio',
      mobileLabel: 'Precio',
      align: 'right',
      cell: renderPriceCell,
    },
    {
      key: 'stock',
      header: 'Stock',
      mobileLabel: 'Stock',
      align: 'right',
      cell: renderStockCell,
    },
  ];

  return (
    <div className="space-y-3">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Inventario</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {products.length} productos
            {lowStockCount > 0 && <span className="ml-2 text-orange-600 font-semibold">· {lowStockCount} bajo</span>}
            {outCount > 0 && <span className="ml-2 text-red-600 font-semibold">· {outCount} agotados</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={products.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 min-h-[44px] px-3 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl active:bg-gray-100 disabled:opacity-40"
            title="Exportar el inventario filtrado a CSV"
          >
            <Download size={16} /> Exportar
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 min-h-[44px] px-3 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl active:bg-gray-100 disabled:opacity-50"
          >
            <Upload size={16} /> {isImporting ? 'Importando…' : 'Importar'}
          </button>
          <button
            type="button"
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 min-h-[44px] px-4 bg-brand-yellow border border-yellow-400 text-navy text-sm font-black uppercase tracking-wide rounded-xl active:bg-yellow-300"
          >
            <PlusCircle size={16} /> Nuevo
          </button>
        </div>
      </div>

      {/* Búsqueda + filtros */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="search"
            placeholder="Buscar nombre, SKU o marca…"
            defaultValue={searchTerm}
            onChange={e => setParam('search', e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            aria-label="Mostrar filtros"
            className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center gap-1 text-xs px-2 rounded-lg border ${showFilters ? 'bg-navy text-white border-navy' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
          >
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>

        {showFilters && (
          <div className="px-3 py-3 space-y-3 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'low', 'out'] as StockFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setStockFilter(f)}
                  className={`min-h-[36px] px-3 rounded-full text-xs font-semibold border transition ${
                    stockFilter === f
                      ? f === 'out'   ? 'bg-red-600 text-white border-red-600'
                      : f === 'low'   ? 'bg-orange-500 text-white border-orange-500'
                      :                 'bg-navy text-white border-navy'
                      : 'bg-white text-gray-600 border-gray-200 active:bg-gray-100'
                  }`}
                >
                  {f === 'all' ? 'Todo' : f === 'low' ? `Bajo stock` : 'Agotados'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setParam('category', e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none min-h-[40px]"
              >
                <option value="">Todas las categorías</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1">
                <span className="font-medium ml-1">Precio</span>
                <input
                  type="number" min="0" placeholder="Min" inputMode="numeric"
                  value={minPrice} onChange={e => setMinPrice(e.target.value)}
                  className="w-16 px-1.5 py-1.5 border-0 outline-none text-xs"
                />
                <span>–</span>
                <input
                  type="number" min="0" placeholder="Max" inputMode="numeric"
                  value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  className="w-16 px-1.5 py-1.5 border-0 outline-none text-xs"
                />
                <span className="text-gray-400">USD</span>
                {(minPrice || maxPrice) && (
                  <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-gray-400 px-1">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <DataTable<Product>
        data={products}
        columns={columns}
        rowKey={p => p.id}
        loading={loading}
        emptyState="No se encontraron productos con los filtros actuales."
        rowAccent={p => p.stock === 0 ? 'danger' : p.stock < LOW_STOCK_THRESHOLD ? 'warning' : 'default'}
        mobileLeading={p => (
          <div className="w-12 h-12 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
            <Image
              src={p.images[0] || '/placeholder-product.png'}
              alt={p.name}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        actions={p => (
          <>
            <TouchIconButton
              variant="primary"
              label="Editar"
              icon={<Edit size={18} />}
              onClick={() => handleEdit(p)}
            />
            <TouchIconButton
              variant="danger"
              label="Eliminar"
              icon={<Trash2 size={18} />}
              onClick={() => handleDelete(p.id, p.name)}
            />
          </>
        )}
      />

      <p className="text-[11px] text-gray-400 text-center pt-2">
        Toca el precio o stock para editar rápido. Doble clic en escritorio.
      </p>

      <AddProductModal isOpen={isModalOpen} onClose={handleClose} product={editingProduct} />
    </div>
  );
}

function ProductsLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1.5">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-11 w-16 bg-gray-200 rounded-xl" />
          <div className="h-11 w-20 bg-gray-200 rounded-xl" />
        </div>
      </div>
      <div className="h-12 bg-gray-200 rounded-xl" />
      <div className="h-64 bg-gray-200 rounded-2xl" />
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<ProductsLoadingSkeleton />}>
      <AdminProductsContent />
    </Suspense>
  );
}
