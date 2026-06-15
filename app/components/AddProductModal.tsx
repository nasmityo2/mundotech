'use client'
import { useTransition, useRef, useEffect, useState, useCallback } from 'react';
import { createProductAction, updateProductAction } from '@/app/actions/productActions';
import { calcSellingPriceUsd, DEFAULT_PROFIT_MARGIN_PCT, DEFAULT_BCV_BINANCE_FACTOR } from '@/lib/pricing-formula';
import { getPricingParams } from '@/app/actions/configActions';
import { X, GripVertical, ImagePlus, Star, Camera, Plus, Trash2, Video, Play } from 'lucide-react';
import { deriveLegacyImagesFromSlots, type ProductGalleryItem } from '@/lib/product-media';
import { parseProductSpecs, type ProductSpec } from '@/lib/definitions';

interface Product {
  id:          string;
  name:        string;
  category:    string;
  price:       number;
  originalPrice?: number | null;
  cost?:        number | null;
  stock:       number;
  images:      string[];
  brand:       string;
  description: string;
  sku?:        string | null;
  specs?:      unknown | null;
  media?:      {
    id:         string;
    type:       'IMAGE' | 'VIDEO';
    url:        string;
    posterUrl:  string | null;
    sortOrder:  number;
  }[];
}

type ImageGallerySlot = { type: 'IMAGE'; url: string };
type VideoGallerySlot = {
  type: 'VIDEO';
  url: string;
  posterUrl?: string;
  jobId?: string;
  status?: 'processing' | 'ready' | 'failed';
  error?: string;
};
type GallerySlot = ImageGallerySlot | VideoGallerySlot;

interface AddProductModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  product:     Product | null;
  categories:  string[];
}

const MAX_SLOTS = 6;
const MAX_VIDEO_BYTES = 95 * 1024 * 1024;

const inputCls = "appearance-none border border-gray-200 bg-gray-50 w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy rounded-md";
const labelCls = "block text-gray-700 text-sm font-bold mb-1";

type SessionVideo = { url: string; posterUrl?: string };

function deleteOrphanVideo(url: string, posterUrl?: string, keepalive = false): void {
  void fetch('/api/upload-video', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, posterUrl }),
    keepalive,
  });
}

export default function AddProductModal({ isOpen, onClose, product, categories }: AddProductModalProps) {
  const [isPending, startTransition] = useTransition();
  const formRef        = useRef<HTMLFormElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef  = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<GallerySlot[]>([]);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const originalProductVideoUrlsRef = useRef<Set<string>>(new Set());
  const sessionUploadedVideosRef = useRef<SessionVideo[]>([]);
  const [serverUploading, setServerUploading] = useState(false);
  const [specs, setSpecs] = useState<ProductSpec[]>([]);
  const [cost, setCost] = useState('');
  const [pricing, setPricing] = useState({ marginPct: DEFAULT_PROFIT_MARGIN_PCT, factor: DEFAULT_BCV_BINANCE_FACTOR });
  // Bloquear scroll del body con modal abierto
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    getPricingParams().then(setPricing).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!formRef.current) return;
    const el = formRef.current.elements as unknown as Record<string, HTMLInputElement | HTMLTextAreaElement>;
    if (product) {
      el.name.value        = product.name;
      el.description.value = product.description;
      el.price.value       = product.price.toString();
      setCost(product.cost != null ? String(product.cost) : '');
      (el.originalPrice as HTMLInputElement).value =
        product.originalPrice != null ? product.originalPrice.toString() : '';
      el.stock.value       = product.stock.toString();
      el.category.value    = product.category;
      el.brand.value       = product.brand;
      el.sku.value         = product.sku ?? '';
      setSpecs(parseProductSpecs(product.specs));
      originalProductVideoUrlsRef.current = new Set(
        (product.media ?? [])
          .filter((m) => m.type === 'VIDEO')
          .map((m) => m.url),
      );
      sessionUploadedVideosRef.current = [];
      if (product.media && product.media.length > 0) {
        setSlots(
          [...product.media]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((m) => {
              if (m.type === 'VIDEO') {
                return {
                  type: 'VIDEO' as const,
                  url: m.url,
                  posterUrl: m.posterUrl ?? undefined,
                  status: 'ready' as const,
                };
              }
              return { type: 'IMAGE' as const, url: m.url };
            }),
        );
      } else {
        setSlots(product.images.filter(Boolean).map((url) => ({ type: 'IMAGE' as const, url })));
      }
    } else {
      formRef.current.reset();
      setCost('');
      setSlots([]);
      setSpecs([]);
      originalProductVideoUrlsRef.current = new Set();
      sessionUploadedVideosRef.current = [];
    }
  }, [product, isOpen]);

  // Polling de trabajos de video en procesamiento
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const poll = async () => {
      const processing = slotsRef.current.filter(
        (s): s is VideoGallerySlot =>
          s.type === 'VIDEO' && s.status === 'processing' && !!s.jobId,
      );
      if (processing.length === 0) return;

      for (const slot of processing) {
        if (cancelled) return;
        try {
          const res = await fetch(`/api/upload-video/status?jobId=${slot.jobId}`);
          const data = (await res.json()) as {
            status?: string;
            url?: string;
            posterUrl?: string;
            error?: string;
          };
          if (data.status === 'ready') {
            setSlots((prev) =>
              prev.map((s) =>
                s.type === 'VIDEO' && s.jobId === slot.jobId
                  ? {
                      type: 'VIDEO',
                      url: data.url ?? s.url,
                      posterUrl: data.posterUrl ?? s.posterUrl,
                      status: 'ready',
                    }
                  : s,
              ),
            );
          } else if (data.status === 'failed') {
            setSlots((prev) =>
              prev.map((s) =>
                s.type === 'VIDEO' && s.jobId === slot.jobId
                  ? {
                      type: 'VIDEO',
                      url: s.url,
                      posterUrl: s.posterUrl,
                      jobId: s.jobId,
                      status: 'failed',
                      error: data.error ?? 'Error al procesar el video.',
                    }
                  : s,
              ),
            );
          }
        } catch {
          /* reintento en el siguiente intervalo */
        }
      }
    };

    const interval = setInterval(poll, 3000);
    void poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen]);

  const addImages = useCallback((urls: string[]) => {
    setSlots((prev) => {
      const imageSlots: GallerySlot[] = urls
        .filter((u) => !prev.some((s) => s.url === u))
        .map((url) => ({ type: 'IMAGE' as const, url }));
      const combined = [...prev, ...imageSlots];
      return combined.slice(0, MAX_SLOTS);
    });
  }, []);

  const removeSlot = (idx: number) => {
    const slot = slots[idx];
    setSlots((prev) => prev.filter((_, i) => i !== idx));
    if (slot?.type === 'VIDEO') {
      const isOriginal = originalProductVideoUrlsRef.current.has(slot.url);
      const isSessionUpload = sessionUploadedVideosRef.current.some((v) => v.url === slot.url);
      if (isSessionUpload && !isOriginal) {
        deleteOrphanVideo(slot.url, slot.posterUrl);
        sessionUploadedVideosRef.current = sessionUploadedVideosRef.current.filter(
          (v) => v.url !== slot.url,
        );
      }
    }
  };

  const uploadFilesViaApi = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = Math.max(0, MAX_SLOTS - slots.length);
    const list = Array.from(files).slice(0, remaining);
    setServerUploading(true);
    try {
      const urls: string[] = [];
      for (const file of list) {
        if (slots.length + urls.length >= MAX_SLOTS) break;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('purpose', 'product');
        const title = formRef.current?.elements.namedItem('name') as HTMLInputElement | null;
        const currentTitle = title?.value?.trim();
        if (currentTitle) {
          fd.append('name', currentTitle);
        }
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          alert(data.error ?? 'No se pudo subir una de las imágenes.');
          break;
        }
        urls.push(data.url);
      }
      if (urls.length) addImages(urls);
    } finally {
      setServerUploading(false);
    }
  }, [addImages, slots.length]);

  const uploadVideoViaApi = useCallback(async (file: File) => {
    if (slots.length >= MAX_SLOTS) return;
    if (file.size > MAX_VIDEO_BYTES) {
      alert('El video supera el tamaño máximo permitido (95 MB).');
      return;
    }
    setServerUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const title = formRef.current?.elements.namedItem('name') as HTMLInputElement | null;
      const currentTitle = title?.value?.trim();
      if (currentTitle) {
        fd.append('name', currentTitle);
      }
      const res = await fetch('/api/upload-video', { method: 'POST', body: fd });
      const data = (await res.json()) as {
        jobId?: string;
        url?: string;
        posterUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        alert(data.error ?? 'No se pudo subir el video.');
        return;
      }
      setSlots((prev) =>
        [
          ...prev,
          {
            type: 'VIDEO' as const,
            url: data.url!,
            posterUrl: data.posterUrl,
            jobId: data.jobId,
            status: 'processing' as const,
          },
        ].slice(0, MAX_SLOTS),
      );
      sessionUploadedVideosRef.current.push({
        url: data.url!,
        posterUrl: data.posterUrl,
      });
    } finally {
      setServerUploading(false);
    }
  }, [slots.length]);

  const moveLeft = (idx: number) => {
    if (idx === 0) return;
    setSlots((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const hasProcessingVideo = slots.some(
    (s) => s.type === 'VIDEO' && s.status === 'processing',
  );
  const hasFailedVideo = slots.some(
    (s) => s.type === 'VIDEO' && s.status === 'failed',
  );

  const handleClose = useCallback(() => {
    for (const v of sessionUploadedVideosRef.current) {
      if (!originalProductVideoUrlsRef.current.has(v.url)) {
        deleteOrphanVideo(v.url, v.posterUrl, true);
      }
    }
    sessionUploadedVideosRef.current = [];
    onClose();
  }, [onClose]);

  const handleSubmitAttempt = useCallback(() => {
    if (hasProcessingVideo) {
      alert('Espera a que el video termine de procesarse antes de guardar.');
      return;
    }
    if (hasFailedVideo) {
      alert('Quita o reemplaza los videos con error antes de guardar.');
      return;
    }
    formRef.current?.requestSubmit();
  }, [hasProcessingVideo, hasFailedVideo]);

  if (!isOpen) return null;

  const suggestedPrice = calcSellingPriceUsd(Number(cost), pricing.marginPct, pricing.factor);
  const onCostChange = (v: string) => {
    setCost(v);
    const priceEl = formRef.current?.elements.namedItem('price') as HTMLInputElement | null;
    if (priceEl) {
      const n = Number(v);
      priceEl.value = n > 0 ? calcSellingPriceUsd(n, pricing.marginPct, pricing.factor).toFixed(2) : '';
    }
  };

  return (
    <div
      className="fixed z-50 inset-0 flex sm:items-center sm:justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div
        className="relative z-10 bg-white text-left shadow-2xl w-full sm:w-[640px] sm:max-w-[95vw] sm:my-6 sm:rounded-2xl flex flex-col max-h-[100dvh] sm:max-h-[88vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header sticky */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b bg-white sm:rounded-t-2xl"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.875rem)' }}
        >
          <h3 className="text-base sm:text-lg font-black text-navy">
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto">

            {/* ── Galería de medios ──────────────────────────────── */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>
                  Galería de medios
                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                    ({slots.length}/{MAX_SLOTS}) · El primer elemento es el principal en la tienda
                  </span>
                </label>
              </div>

              {slots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {slots.map((slot, idx) => {
                    const previewSrc =
                      slot.type === 'VIDEO'
                        ? slot.posterUrl ?? '/placeholder-product.png'
                        : slot.url;

                    return (
                      <div
                        key={`${slot.type}-${idx}-${slot.url.slice(0, 24)}`}
                        className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewSrc}
                          alt={`Medio ${idx + 1}`}
                          className="w-full h-full object-contain p-1"
                        />

                        {slot.type === 'VIDEO' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/40 rounded-full p-1.5">
                              <Play size={14} className="text-white fill-white" />
                            </div>
                          </div>
                        )}

                        {slot.type === 'VIDEO' && slot.status === 'processing' && (
                          <div className="absolute bottom-1 left-1 right-1 z-[1] bg-amber-500/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded text-center">
                            Procesando…
                          </div>
                        )}

                        {slot.type === 'VIDEO' && slot.status === 'failed' && (
                          <div className="absolute bottom-1 left-1 right-1 z-[1] bg-red-500/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded text-center truncate">
                            {slot.error ?? 'Error'}
                          </div>
                        )}

                        {idx === 0 && (
                          <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-brand-yellow/90 text-navy text-[9px] font-black px-1.5 py-0.5 rounded z-[1]">
                            <Star size={8} className="fill-navy" /> Principal
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-[2]">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveLeft(idx)}
                              title="Mover a la izquierda"
                              className="bg-white/90 hover:bg-white text-gray-700 rounded-full p-1.5 transition"
                            >
                              <GripVertical size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeSlot(idx)}
                            title="Quitar"
                            className="bg-red-500/90 hover:bg-red-600 text-white rounded-full p-1.5 transition"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {slots.length < MAX_SLOTS && (
                <div className="space-y-3">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={serverUploading}
                    onChange={e => {
                      void uploadFilesViaApi(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={serverUploading}
                    onChange={e => {
                      void uploadFilesViaApi(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,.mp4,.mov,.webm,.avi,.mkv"
                    className="hidden"
                    disabled={serverUploading}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) void uploadVideoViaApi(file);
                      e.target.value = '';
                    }}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={serverUploading}
                      onClick={() => cameraInputRef.current?.click()}
                      className="min-h-[52px] flex items-center justify-center gap-2 bg-navy text-white font-semibold rounded-xl active:bg-navy/80 transition text-sm disabled:opacity-60"
                    >
                      <Camera size={17} /> Tomar foto
                    </button>
                    <button
                      type="button"
                      disabled={serverUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[52px] flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 font-semibold rounded-xl active:bg-gray-100 transition text-sm disabled:opacity-60"
                    >
                      <ImagePlus size={17} /> Galería
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={serverUploading}
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 font-semibold rounded-xl active:bg-gray-100 transition text-sm disabled:opacity-60"
                  >
                    <Video size={17} /> Subir video
                  </button>
                  <p className="text-[11px] text-gray-400 text-center">
                    Video: máx. 95 MB y 3 min. Espera a &ldquo;listo&rdquo; antes de guardar.
                  </p>
                  {serverUploading && (
                    <p className="text-xs text-center text-gray-500">Subiendo imagen…</p>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      O pega la URL de una imagen (Enter para añadir):
                    </p>
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className={inputCls}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) { addImages([val]); (e.target as HTMLInputElement).value = ''; }
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {slots.length >= MAX_SLOTS && (
                <p className="text-xs text-amber-600 mt-2">
                  Límite de {MAX_SLOTS} elementos. Elimina uno para añadir otro.
                </p>
              )}
            </div>

            {/* ── Formulario ──────────────────────────────────────── */}
            <form
              ref={formRef}
              onSubmit={(e) => {
                if (hasProcessingVideo) {
                  e.preventDefault();
                  alert('Espera a que el video termine de procesarse antes de guardar.');
                  return;
                }
                if (hasFailedVideo) {
                  e.preventDefault();
                  alert('Quita o reemplaza los videos con error antes de guardar.');
                }
              }}
              action={async (formData) => {
                const currentSlots = slotsRef.current;
                if (currentSlots.some((s) => s.type === 'VIDEO' && s.status === 'processing')) {
                  alert('Espera a que el video termine de procesarse antes de guardar.');
                  return;
                }
                if (currentSlots.some((s) => s.type === 'VIDEO' && s.status === 'failed')) {
                  alert('Quita o reemplaza los videos con error antes de guardar.');
                  return;
                }

                const mediaForSave: ProductGalleryItem[] = currentSlots.map((s) => {
                  if (s.type === 'VIDEO') {
                    return { type: 'VIDEO' as const, url: s.url, posterUrl: s.posterUrl };
                  }
                  return { type: 'IMAGE' as const, url: s.url };
                });
                const legacyImages = deriveLegacyImagesFromSlots(mediaForSave);
                formData.set('imagesJson', JSON.stringify(legacyImages));
                formData.set('mediaJson', JSON.stringify(mediaForSave));
                formData.set('specsJson',  JSON.stringify(specs));
                startTransition(async () => {
                  const action = product
                    ? updateProductAction.bind(null, product.id)
                    : createProductAction;
                  const result = await action(formData);
                  if (result.success) {
                    sessionUploadedVideosRef.current = [];
                    onClose();
                    if (!product) formRef.current?.reset();
                  } else {
                    alert(result.message);
                  }
                });
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="sm:col-span-2">
                  <label htmlFor="name" className={labelCls}>Nombre <span className="text-red-500">*</span></label>
                  <input type="text" name="name" id="name" required className={inputCls} />
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2">
                  <label htmlFor="description" className={labelCls}>Descripción <span className="text-red-500">*</span></label>
                  <textarea name="description" id="description" required rows={3} className={inputCls} />
                </div>

                {/* Costo */}
                <div>
                  <label htmlFor="cost" className={labelCls}>Costo (USD) *</label>
                  <input type="number" name="cost" id="cost" step="0.01" min="0" className={inputCls}
                    value={cost} onChange={(e) => onCostChange(e.target.value)} />
                  {Number(cost) > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Precio sugerido: <strong>${suggestedPrice.toFixed(2)}</strong>
                      {' '}· costo × {(1 + pricing.marginPct / 100).toFixed(2)} × {pricing.factor}
                    </p>
                  )}
                </div>

                {/* Precio */}
                <div>
                  <label htmlFor="price" className={labelCls}>Precio (USD) <span className="text-red-500">*</span></label>
                  <input type="number" name="price" id="price" required step="0.01" min="0" className={inputCls} />
                </div>

                <div>
                  <label htmlFor="originalPrice" className={labelCls}>
                    Precio anterior (USD)
                    <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional · actívalo para poner en oferta)</span>
                  </label>
                  <input type="number" step="0.01" min="0" name="originalPrice" id="originalPrice"
                    placeholder="Ej: 50.00" className={inputCls} />
                  <p className="mt-1 text-xs text-gray-400">Si es mayor al precio actual, el producto aparece en “Ofertas” con su descuento.</p>
                </div>

                {/* Stock */}
                <div>
                  <label htmlFor="stock" className={labelCls}>Stock <span className="text-red-500">*</span></label>
                  <input type="number" name="stock" id="stock" required min="0" className={inputCls} />
                </div>

                {/* Categoría */}
                <div>
                  <label htmlFor="category" className={labelCls}>Categoría <span className="text-red-500">*</span></label>
                  <input list="category-options" name="category" id="category"
                    className={inputCls} autoComplete="off" placeholder="Elige o escribe una categoría" required />
                  <datalist id="category-options">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {/* Marca */}
                <div>
                  <label htmlFor="brand" className={labelCls}>Marca</label>
                  <input type="text" name="brand" id="brand" className={inputCls} />
                </div>

                {/* SKU */}
                <div className="sm:col-span-2">
                  <label htmlFor="sku" className={labelCls}>
                    SKU / Referencia
                    <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    name="sku"
                    id="sku"
                    placeholder="Ej: SEC-REM-001, LH-00001984..."
                    className={inputCls}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Código interno. Si se define, debe ser único.
                  </p>
                </div>
              </div>

              {/* ── Especificaciones técnicas ────────────────────── */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>
                    Especificaciones técnicas
                    <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSpecs(prev => [...prev, { name: '', value: '' }])}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-navy border border-navy/30 rounded-lg px-2.5 py-1.5 hover:bg-navy/5 transition"
                  >
                    <Plus size={13} /> Añadir fila
                  </button>
                </div>

                {specs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    Sin especificaciones. Añade filas como &ldquo;RAM / 8 GB&rdquo;, &ldquo;Pantalla / 6.7 pulgadas&rdquo;, etc.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {specs.map((spec, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nombre (ej: RAM)"
                          value={spec.name}
                          onChange={e => setSpecs(prev => prev.map((s, i) => i === idx ? { ...s, name: e.target.value } : s))}
                          className={`${inputCls} flex-1`}
                        />
                        <input
                          type="text"
                          placeholder="Valor (ej: 8 GB)"
                          value={spec.value}
                          onChange={e => setSpecs(prev => prev.map((s, i) => i === idx ? { ...s, value: e.target.value } : s))}
                          className={`${inputCls} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() => setSpecs(prev => prev.filter((_, i) => i !== idx))}
                          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition"
                          aria-label="Eliminar fila"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </form>
        </div>

        {/* Footer sticky */}
        <div
          className="sticky bottom-0 z-10 flex gap-2 px-4 sm:px-6 py-3 border-t border-gray-100 bg-white sm:rounded-b-2xl"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 min-h-[52px] rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold active:bg-gray-100 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmitAttempt}
            disabled={isPending || hasProcessingVideo}
            className="flex-[2] min-h-[52px] rounded-xl bg-brand-yellow border border-yellow-400 text-navy text-sm font-black uppercase tracking-wide active:bg-yellow-300 transition disabled:opacity-60 inline-flex items-center justify-center"
          >
            {isPending
              ? 'Guardando…'
              : hasProcessingVideo
                ? 'Procesando video…'
                : product
                  ? 'Guardar cambios'
                  : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  );
}
