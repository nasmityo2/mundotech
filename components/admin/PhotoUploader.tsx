'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, ImagePlus, X, Loader2, Check } from 'lucide-react';

interface PhotoUploaderProps {
  /** URL actual (cuando ya hay una foto subida). */
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Carpeta lógica en R2 (vía /api/upload?purpose=...). */
  purpose?: 'banner' | 'product' | 'tracking' | 'seo' | 'category';
  /** Texto del label/title. */
  label?: string;
  /** Texto descriptivo bajo el label. */
  hint?: string;
  /** Si la subida es opcional, permitir limpiar. */
  optional?: boolean;
  /** Limitar tamaño antes de subir (KB). Por defecto 8 MB. */
  maxSizeMB?: number;
  /** Tamaño visual del preview (Tailwind h-XX). */
  previewHeight?: string;
  className?: string;
}

/**
 * Subida de foto optimizada para iOS y Android:
 * - Botón "Tomar foto" usa `capture="environment"` (cámara trasera).
 * - Botón "Galería" no usa `capture`, dejando elegir desde el carrete.
 * - Compresión client-side ligera (canvas, sin libs externas) si la foto > 1.5 MB.
 * - HEIC/HEIF: el servidor convierte a WebP vía sharp en /api/upload.
 */
export default function PhotoUploader({
  value,
  onChange,
  purpose = 'tracking',
  label = 'Foto',
  hint,
  optional = true,
  maxSizeMB = 8,
  previewHeight = 'h-48',
  className = '',
}: PhotoUploaderProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const compressIfNeeded = async (file: File): Promise<Blob> => {
    if (file.size <= 1.5 * 1024 * 1024) return file;
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      return await new Promise<Blob>((resolve) => {
        canvas.toBlob(b => resolve(b ?? file), 'image/jpeg', 0.85);
      });
    } catch {
      return file;
    }
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`El archivo supera ${maxSizeMB} MB.`);
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const blob = await compressIfNeeded(file);
      setProgress(35);

      const fd = new FormData();
      fd.append('file', blob, file.name || 'photo.jpg');
      fd.append('purpose', purpose);

      const xhr = new XMLHttpRequest();
      const result = await new Promise<{ url: string }>((resolve, reject) => {
        xhr.open('POST', '/api/upload');
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress(35 + Math.round((ev.loaded / ev.total) * 60));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(e);
            }
          } else {
            try {
              const body = JSON.parse(xhr.responseText) as { error?: string };
              reject(new Error(body.error ?? `HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Error de red al subir.'));
        xhr.send(fd);
      });

      setProgress(100);
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir.');
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-700">
            {label}
            {optional && <span className="ml-1.5 text-[10px] font-medium text-gray-400 normal-case">(opcional)</span>}
          </p>
          {value && optional && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[11px] text-gray-400 underline"
            >
              Quitar
            </button>
          )}
        </div>
      )}

      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}

      {value ? (
        <div className={`relative w-full ${previewHeight} bg-gray-50 border border-gray-200 rounded-xl overflow-hidden group`}>
          <Image
            src={value}
            alt={label}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-contain"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Quitar foto"
            className="absolute top-2 right-2 w-9 h-9 bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center"
          >
            <X size={16} />
          </button>
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold bg-green-500/95 text-white px-2 py-1 rounded-md">
            <Check size={12} /> Subida
          </span>
        </div>
      ) : (
        <div className={`relative w-full ${previewHeight} bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 ${uploading ? 'pointer-events-none opacity-70' : ''}`}>
          {uploading ? (
            <>
              <Loader2 size={28} className="text-navy animate-spin" />
              <p className="text-xs font-semibold text-gray-600">Subiendo… {progress}%</p>
              <div className="w-3/4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-yellow transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Camera size={28} className="text-gray-400" />
              <p className="text-xs text-gray-500">Aún sin foto</p>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-navy text-white text-sm font-semibold rounded-xl active:bg-navy/80 disabled:opacity-50"
        >
          <Camera size={17} /> Tomar foto
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={uploading}
          className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl active:bg-gray-100 disabled:opacity-50"
        >
          <ImagePlus size={17} /> Galería
        </button>
      </div>

      {error && (
        <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
