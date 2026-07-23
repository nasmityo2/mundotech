'use client';

import { useEffect, useState, useRef, useTransition, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { PlusCircle, Trash2, Edit, Upload, Download, Check, X, Search, ChevronDown, RotateCcw } from 'lucide-react';
import {
  getProductsAdmin,
  deleteProductAction,
  setProductActiveAction,
  importProductsFromCSV,
  quickUpdateStockAction,
  quickUpdatePriceAction,
} from '@/app/actions/productActions';
import { d, dn } from '@/lib/decimal';
import AddProductModal from '@/app/components/AddProductModal';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { TouchIconButton } from '@/components/admin/TouchIconButton';
import { downloadCsv, csvDateStamp } from '@/lib/csv-export';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface Product {
  id:          string;
  sku?:        string | null;
  name:        string;
  category:    string;
  price:       number;
  originalPrice?: number | null;
  cost?:        number | null;
  profitMarginPct?: number | null;
  stock:       number;
  images:      string[];
  brand:       string;
  isActive?:   boolean;
  freeShipping: boolean;
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

/** Resultado del import CSV mostrado en panel (PRD-085: detalle por fila, no alert). */
interface ImportResult {
  success:      boolean;
  message:      string;
  createdCount: number;
  updatedCount: number;
  errors:       string[];
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
  const [loadError, setLoadError]         = useState(false);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImporting, startImportTr]      = useTransition();
  const [importResult, setImportResult]   = useState<ImportResult | null>(null);
  const [inlineEdit, setInlineEdit]       = useState<InlineEdit | null>(null);
  const [inlineError, setInlineError]     = useState<string | null>(null);
  const [savingInline, startInlineTr]     = useTransition();
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const inlineInputRef                    = useRef<HTMLInputElement>(null);

  const [stockFilter, setStockFilter]     = useState<StockFilter>('all');
  const [showFilters, setShowFilters]     = useState(false);

  const searchParams   = useSearchParams();
  const router         = useRouter();
  const pathname       = usePathname();
  const searchTerm     = searchParams.get('search')   ?? '';
  const categoryFilter = searchParams.get('category') ?? '';
  const minPriceFromUrl = searchParams.get('minPrice') ?? '';
  const maxPriceFromUrl = searchParams.get('maxPrice') ?? '';

  const [searchInput, setSearchInput] = useState(searchTerm);
  const [minPrice, setMinPrice] = useState(minPriceFromUrl);
  const [maxPrice, setMaxPrice] = useState(maxPriceFromUrl);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const debouncedMinPrice = useDebouncedValue(minPrice, 300);
  const debouncedMaxPrice = useDebouncedValue(maxPrice, 300);
  const skipDebouncedUrlSync = useRef(true);

  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    setMinPrice(minPriceFromUrl);
  }, [minPriceFromUrl]);

  useEffect(() => {
    setMaxPrice(maxPriceFromUrl);
  }, [maxPriceFromUrl]);

  useEffect(() => {
    if (skipDebouncedUrlSync.current) {
      skipDebouncedUrlSync.current = false;
      return;
    }
    const searchTrimmed = debouncedSearch.trim();
    const minTrimmed = debouncedMinPrice.trim();
    const maxTrimmed = debouncedMaxPrice.trim();
    const searchCurrent = searchTerm.trim();
    const minCurrent = minPriceFromUrl.trim();
    const maxCurrent = maxPriceFromUrl.trim();
    if (
      searchTrimmed === searchCurrent &&
      minTrimmed === minCurrent &&
      maxTrimmed === maxCurrent
    ) {
      return;
    }
    const params = new URLSearchParams(searchParams);
    if (searchTrimmed) params.set('search', searchTrimmed);
    else params.delete('search');
    if (minTrimmed) params.set('minPrice', minTrimmed);
    else params.delete('minPrice');
    if (maxTrimmed) params.set('maxPrice', maxTrimmed);
    else params.delete('maxPrice');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    debouncedSearch,
    debouncedMinPrice,
    debouncedMaxPrice,
    searchTerm,
    minPriceFromUrl,
    maxPriceFromUrl,
    searchParams,
    router,
    pathname,
  ]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const parsedMin = minPriceFromUrl ? parseFloat(minPriceFromUrl) : undefined;
      const parsedMax = maxPriceFromUrl ? parseFloat(maxPriceFromUrl) : undefined;
      const { products: data, categories: cats } = await getProductsAdmin({
        search:      searchTerm     || undefined,
        category:    categoryFilter || undefined,
        minPrice:    parsedMin != null && !Number.isNaN(parsedMin) ? parsedMin : undefined,
        maxPrice:    parsedMax != null && !Number.isNaN(parsedMax) ? parsedMax : undefined,
        stockFilter,
        lowThreshold: LOW_STOCK_THRESHOLD,
      });
      // PRD-204: normalizar Decimal → number
      setProducts(data.map(p => ({
        ...p,
        price: d(p.price),
        originalPrice: dn(p.originalPrice),
        cost: dn(p.cost),
        profitMarginPct: p.profitMarginPct != null ? Number(p.profitMarginPct) : null,
      })) as Product[]);
      setCategories(cats);
      setLoadError(false);
    } catch (err) {
      // RUN-12/ADM: sin este catch, un fallo de red/sesión dejaba la lista
      // vacía sin ninguna señal para el operador.
      console.error('[admin/products] error cargando inventario:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, minPriceFromUrl, maxPriceFromUrl, stockFilter]);

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

  // PRD-153: cabeceras canónicas idénticas a las que espera importProductsFromCSV
  // → round-trip completo exportar → editar → importar, con SKU como clave.
  const handleExportCsv = useCallback(() => {
    const rows = products.map(p => ({
      sku: p.sku ?? '',
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      stock: p.stock,
      description: p.description ?? '',
      imageUrl: p.images?.[0] ?? '',
      freeShipping: p.freeShipping ? 'true' : 'false',
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
    const res = await deleteProductAction(id);
    if (!res?.success) {
      window.alert(res?.message ?? 'No se pudo eliminar el producto.');
      return;
    }
    if (res.softDeleted) {
      window.alert(res.message);
    }
    loadProducts();
  };

  const handleReactivate = async (id: string) => {
    const res = await setProductActiveAction(id, true);
    if (!res?.success) {
      window.alert(res?.message ?? 'No se pudo reactivar el producto.');
      return;
    }
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
        // PRD-085: resultado en panel con detalle por fila (antes: alert sin contexto)
        const res = await importProductsFromCSV(csv);
        setImportResult(res);
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
    // PRD-086: la tabla solo refleja el nuevo valor si el servidor confirmó el
    // guardado; en error se conserva el valor real y se avisa al operador.
    startInlineTr(async () => {
      const nextValue = field === 'stock' ? Math.floor(parsed) : parsed;
      const res = field === 'stock'
        ? await quickUpdateStockAction(id, nextValue)
        : await quickUpdatePriceAction(id, nextValue);

      if (res.success) {
        setInlineError(null);
        setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: nextValue } : p));
      } else {
        const target = products.find(p => p.id === id);
        setInlineError(
          `No se guardó el ${field === 'stock' ? 'stock' : 'precio'}${target ? ` de «${target.name}»` : ''}: ${('message' in res && res.message) || 'error desconocido'}. El valor mostrado es el actual.`,
        );
      }
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
      <button type="button"
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
          <button type="button" onClick={commitInlineEdit} disabled={savingInline} className="text-green-600"><Check size={14} /></button>
          <button type="button" onClick={cancelInlineEdit} className="text-gray-400"><X size={14} /></button>
        </span>
      );
    }
    return (
      <button type="button"
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
          {p.brand && <span className="text-gray-500 font-normal text-xs ml-1">· {p.brand}</span>}
          {p.isActive === false && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600 align-middle">
              Despublicado
            </span>
          )}
          <span
            className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border align-middle ${
              p.freeShipping
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-slate-600 bg-slate-50 border-slate-200'
            }`}
          >
            {p.freeShipping ? 'Envío gratis' : 'Cobro a destino'}
          </span>
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
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="flex-1 text-base sm:text-sm bg-transparent outline-none placeholder:text-gray-400"
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
                <button type="button"
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
                className="text-base sm:text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none min-h-[40px]"
              >
                <option value="">Todas las categorías</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1">
                <span className="font-medium ml-1">Precio</span>
                <input
                  type="number" min="0" placeholder="Min" inputMode="numeric"
                  value={minPrice} onChange={e => setMinPrice(e.target.value)}
                  className="w-16 px-1.5 py-1.5 border-0 outline-none text-base sm:text-sm"
                />
                <span>–</span>
                <input
                  type="number" min="0" placeholder="Max" inputMode="numeric"
                  value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  className="w-16 px-1.5 py-1.5 border-0 outline-none text-base sm:text-sm"
                />
                <span className="text-gray-400">USD</span>
                {(minPrice || maxPrice) && (
                  <button type="button"
                    onClick={() => {
                      setMinPrice('');
                      setMaxPrice('');
                      const params = new URLSearchParams(searchParams);
                      params.delete('minPrice');
                      params.delete('maxPrice');
                      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                    }}
                    className="text-gray-400 px-1"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRD-085: resultado del import con detalle por fila */}
      {importResult && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          importResult.success
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold">{importResult.message}</p>
            <button
              type="button"
              onClick={() => setImportResult(null)}
              aria-label="Cerrar resultado de importación"
              className="flex-shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full active:bg-black/10"
            >
              <X size={14} />
            </button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto space-y-1 text-[12px] font-mono list-disc list-inside">
              {importResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* PRD-086: error de edición inline (el valor en tabla sigue siendo el real) */}
      {inlineError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{inlineError}</p>
          <button
            type="button"
            onClick={() => setInlineError(null)}
            aria-label="Cerrar aviso"
            className="flex-shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full active:bg-black/10"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loadError && (
        <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          No se pudo cargar el inventario. Revisa tu conexión y recarga la página.
        </div>
      )}

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
            {p.isActive === false && (
              <TouchIconButton
                variant="primary"
                label="Reactivar"
                icon={<RotateCcw size={18} />}
                onClick={() => handleReactivate(p.id)}
              />
            )}
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

      <p className="text-[11px] text-gray-600 text-center pt-2">
        Toca el precio o stock para editar rápido. Doble clic en escritorio.
      </p>

      <AddProductModal isOpen={isModalOpen} onClose={handleClose} product={editingProduct} categories={categories} />
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
