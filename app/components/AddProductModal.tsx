'use client'
import { useTransition, useRef, useEffect, useState, useCallback } from 'react';
import { createProductAction, updateProductAction } from '@/app/actions/productActions';
import { CldUploadWidget } from 'next-cloudinary';
import { X, GripVertical, ImagePlus, Star, Play, Video } from 'lucide-react';
import { deriveLegacyImagesFromSlots } from '@/lib/product-media';

interface Product {
  id:          string;
  name:        string;
  category:    string;
  price:       number;
  stock:       number;
  images:      string[];
  brand:       string;
  description: string;
  sku?:        string | null;
  media?:      {
    id:         string;
    type:       'IMAGE' | 'VIDEO';
    url:        string;
    posterUrl:  string | null;
    sortOrder:  number;
  }[];
}

type GallerySlot =
  | { type: 'IMAGE'; url: string }
  | { type: 'VIDEO'; url: string; posterUrl?: string };

interface AddProductModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  product:  Product | null;
}

const MAX_SLOTS = 6;

const inputCls = "appearance-none border border-gray-200 bg-gray-50 w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy rounded-md";
const labelCls = "block text-gray-700 text-sm font-bold mb-1";

export default function AddProductModal({ isOpen, onClose, product }: AddProductModalProps) {
  const [isPending, startTransition] = useTransition();
  const formRef       = useRef<HTMLFormElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<GallerySlot[]>([]);
  const [serverUploading, setServerUploading] = useState(false);
  const [bunnyUrl, setBunnyUrl] = useState('');
  const [bunnyPoster, setBunnyPoster] = useState('');
  const hasCloudinary = Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

  useEffect(() => {
    if (!formRef.current) return;
    const el = formRef.current.elements as Record<string, HTMLInputElement | HTMLTextAreaElement>;
    if (product) {
      el.name.value        = product.name;
      el.description.value = product.description;
      el.price.value       = product.price.toString();
      el.stock.value       = product.stock.toString();
      el.category.value    = product.category;
      el.brand.value       = product.brand;
      el.sku.value         = product.sku ?? '';
      if (product.media && product.media.length > 0) {
        setSlots(
          [...product.media]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((m) =>
              m.type === 'VIDEO'
                ? { type: 'VIDEO', url: m.url, posterUrl: m.posterUrl ?? undefined }
                : { type: 'IMAGE', url: m.url },
            ),
        );
      } else {
        setSlots(product.images.filter(Boolean).map((url) => ({ type: 'IMAGE' as const, url })));
      }
    } else {
      formRef.current.reset();
      setSlots([]);
    }
    setBunnyUrl('');
    setBunnyPoster('');
  }, [product, isOpen]);

  const addImages = useCallback((urls: string[]) => {
    setSlots((prev) => {
      const imageSlots: GallerySlot[] = urls
        .filter((u) => !prev.some((s) => s.type === 'IMAGE' && s.url === u))
        .map((url) => ({ type: 'IMAGE' as const, url }));
      const combined = [...prev, ...imageSlots];
      return combined.slice(0, MAX_SLOTS);
    });
  }, []);

  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
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

  const moveLeft = (idx: number) => {
    if (idx === 0) return;
    setSlots((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const addBunnyVideo = () => {
    const url = bunnyUrl.trim();
    if (!url) {
      alert('Pega la URL del iframe de Bunny Stream (embed).');
      return;
    }
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      alert('URL del vídeo no válida.');
      return;
    }
    if (slots.length >= MAX_SLOTS) {
      alert(`Máximo ${MAX_SLOTS} elementos en la galería.`);
      return;
    }
    const poster = bunnyPoster.trim();
    setSlots((prev) => [
      ...prev,
      {
        type: 'VIDEO',
        url,
        ...(poster ? { posterUrl: poster } : {}),
      },
    ]);
    setBunnyUrl('');
    setBunnyPoster('');
  };

  const thumbSrcForSlot = (slot: GallerySlot, all: GallerySlot[]) => {
    if (slot.type === 'IMAGE') return slot.url;
    if (slot.posterUrl?.trim()) return slot.posterUrl.trim();
    const firstImg = all.find((s) => s.type === 'IMAGE');
    return firstImg?.url ?? '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pb-20 pt-4 text-center">
        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={onClose} />

        <div className="relative z-10 bg-white rounded-xl text-left shadow-2xl w-full max-w-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b">
            <h3 className="text-lg font-bold text-gray-900">
              {product ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
          </div>

          <div className="px-6 py-5 max-h-[82vh] overflow-y-auto">

            {/* ── Galería de imágenes ──────────────────────────────── */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>
                  Galería (fotos + vídeo Bunny)
                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                    ({slots.length}/{MAX_SLOTS}) · El primer elemento es el principal en la tienda
                  </span>
                </label>
              </div>

              {slots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {slots.map((slot, idx) => {
                    const thumb = thumbSrcForSlot(slot, slots);
                    return (
                      <div
                        key={`${slot.type}-${idx}-${slot.url.slice(0, 24)}`}
                        className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square"
                      >
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={slot.type === 'VIDEO' ? `Vídeo ${idx + 1}` : `Foto ${idx + 1}`}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-semibold p-2 text-center">
                            <Video size={20} />
                            Vídeo
                          </div>
                        )}

                        {slot.type === 'VIDEO' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="rounded-full bg-brand-yellow/95 p-1.5 border border-yellow-500/80 shadow">
                              <Play className="w-3.5 h-3.5 text-navy" fill="currentColor" strokeWidth={0} />
                            </span>
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
                  <div className="rounded-lg border border-dashed border-gray-300 bg-slate-50/80 p-3 space-y-2">
                    <p className="text-xs font-bold text-navy uppercase tracking-wide">Vídeo Bunny Stream</p>
                    <p className="text-[11px] text-gray-500">
                      Pega la URL del embed (<code className="text-[10px]">iframe.mediadelivery.net/embed/…</code>).
                      Opcional: URL de poster (Cloudinary) para miniatura y carga rápida.
                    </p>
                    <input
                      type="url"
                      value={bunnyUrl}
                      onChange={(e) => setBunnyUrl(e.target.value)}
                      placeholder="https://iframe.mediadelivery.net/embed/…"
                      className={inputCls}
                    />
                    <input
                      type="url"
                      value={bunnyPoster}
                      onChange={(e) => setBunnyPoster(e.target.value)}
                      placeholder="Poster (opcional) — imagen Cloudinary"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={addBunnyVideo}
                      className="w-full text-sm font-bold py-2 rounded-lg bg-navy text-white hover:bg-navy/90 transition"
                    >
                      Añadir vídeo a la galería
                    </button>
                  </div>

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
                  <button
                    type="button"
                    disabled={serverUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-600 font-semibold py-3 px-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-navy/40 hover:bg-gray-100 transition text-sm disabled:opacity-60"
                  >
                    <ImagePlus size={16} />
                    {serverUploading
                      ? 'Subiendo…'
                      : slots.length === 0
                        ? 'Subir fotos desde tu equipo'
                        : `Añadir fotos (${MAX_SLOTS - slots.length} libres)`}
                  </button>

                  {hasCloudinary && (
                    <CldUploadWidget
                      uploadPreset="ml_default"
                      options={{
                        sources: ['local', 'url', 'camera'],
                        multiple:  true,
                        maxFiles:  MAX_SLOTS - slots.length,
                        clientAllowedFormats: ['webp', 'avif', 'jpeg', 'png'],
                        theme: 'minimal',
                        showPoweredBy: false,
                        styles: { palette: { action: '#1a1a2e' } },
                      }}
                      onSuccess={(result) => {
                        if (
                          typeof result.info === 'object' &&
                          result.info !== null &&
                          'secure_url' in result.info
                        ) {
                          addImages([result.info.secure_url as string]);
                        }
                      }}
                    >
                      {({ open }) => (
                        <button
                          type="button"
                          onClick={() => open()}
                          className="w-full text-sm text-navy/80 font-medium py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                        >
                          O usar selector Cloudinary (cámara, URL…)
                        </button>
                      )}
                    </CldUploadWidget>
                  )}

                  {!hasCloudinary && (
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
                  )}
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
              action={async (formData) => {
                const legacyImages = deriveLegacyImagesFromSlots(slots);
                formData.set('imagesJson', JSON.stringify(legacyImages));
                formData.set('mediaJson', JSON.stringify(slots));
                startTransition(async () => {
                  const action = product
                    ? updateProductAction.bind(null, product.id)
                    : createProductAction;
                  const result = await action(formData);
                  if (result.success) {
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

                {/* Precio */}
                <div>
                  <label htmlFor="price" className={labelCls}>Precio (USD) <span className="text-red-500">*</span></label>
                  <input type="number" name="price" id="price" required step="0.01" min="0" className={inputCls} />
                </div>

                {/* Stock */}
                <div>
                  <label htmlFor="stock" className={labelCls}>Stock <span className="text-red-500">*</span></label>
                  <input type="number" name="stock" id="stock" required min="0" className={inputCls} />
                </div>

                {/* Categoría */}
                <div>
                  <label htmlFor="category" className={labelCls}>Categoría <span className="text-red-500">*</span></label>
                  <input type="text" name="category" id="category" required className={inputCls} />
                </div>

                {/* Marca */}
                <div>
                  <label htmlFor="brand" className={labelCls}>Marca <span className="text-red-500">*</span></label>
                  <input type="text" name="brand" id="brand" required className={inputCls} />
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

              {/* Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-brand-yellow border border-yellow-400 text-navy text-sm font-black uppercase tracking-wide rounded-lg hover:bg-yellow-300 transition disabled:opacity-50"
                >
                  {isPending ? 'Guardando…' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
