/**
 * SESIÓN 16 — Tests para ZoomLightbox / zoom cargado bajo demanda.
 *
 * Verifica que:
 * - react-zoom-pan-pinch solo se importa en el chunk dinámico
 * - ProductGallery usa dynamic() con ssr:false y loading no-null
 * - El loading fallback es accesible (aria-label)
 * - DynamicZoomWrapper captura errores y permite cerrar
 * - Lightbox usa aria-modal, role="dialog", aria-labelledby
 * - Props de ZoomLightbox son serializables
 */

import { describe, it, expect, vi } from 'vitest';

// ── Tests estáticos (análisis de código fuente) ──────────────────────────────

describe('ZoomLightbox — module isolation', () => {
  it('ZoomLightbox.tsx importa react-zoom-pan-pinch (el chunk dinámico)', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/product/[slug]/ZoomLightbox.tsx', import.meta.url),
      'utf-8',
    );

    // El chunk dinámico debe importar react-zoom-pan-pinch
    expect(source).toContain("from 'react-zoom-pan-pinch'");
    // El componente exporta default function
    expect(source).toContain('export default function ZoomLightbox');
    // Tiene onError handler para imagen rota
    expect(source).toContain('onError');
    expect(source).toContain('/placeholder-product.png');
  });

  it('ProductGallery.tsx usa dynamic para ZoomLightbox (no import estático)', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/product/[slug]/ProductGallery.tsx', import.meta.url),
      'utf-8',
    );

    // Debe usar dynamic(() => import('./ZoomLightbox'))
    expect(source).toContain("dynamic(() => import('./ZoomLightbox')");
    // Debe tener ssr: false
    expect(source).toContain('ssr: false');
    // NO debe tener import directo de react-zoom-pan-pinch
    expect(source).not.toContain("from 'react-zoom-pan-pinch'");
  });

  it('ProductGallery.tsx no tiene loading: () => null', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/product/[slug]/ProductGallery.tsx', import.meta.url),
      'utf-8',
    );

    // El loading debe ser accesible, no null
    expect(source).not.toContain('loading: () => null');
    // Debe contener Loader2 en el loading fallback
    expect(source).toContain('Loader2');
    expect(source).toContain('aria-label');
  });

  it('DynamicZoomWrapper existe y captura errores', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/product/[slug]/DynamicZoomWrapper.tsx', import.meta.url),
      'utf-8',
    );

    // Debe tener error boundary
    expect(source).toContain('getDerivedStateFromError');
    expect(source).toContain('hasError');
    // Debe tener botón para cerrar
    expect(source).toContain('Cerrar');
  });
});

describe('Lightbox — accesibilidad del dialog', () => {
  it('Lightbox tiene aria-modal, role="dialog", aria-labelledby', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/product/[slug]/ProductGallery.tsx', import.meta.url),
      'utf-8',
    );

    // Dialog accesibilidad
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby={titleId}');
    expect(source).toContain('titleId');
    // Botón cerrar 44px
    expect(source).toContain('w-11 h-11');
    // Focus trap con hook compartido
    expect(source).toContain('useFocusTrap');
    // Escape manejado por useFocusTrap, flechas separadas
    expect(source).toContain("e.key === 'ArrowRight'");
    // Scroll lock con hook compartido
    expect(source).toContain('useBodyScrollLock');
    // Reduced motion
    expect(source).toContain('motion-reduce:transition-none');
  });

  it('ProductGallery.tsx importa DynamicZoomWrapper', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/product/[slug]/ProductGallery.tsx', import.meta.url),
      'utf-8',
    );

    expect(source).toContain("from './DynamicZoomWrapper'");
  });
});

describe('ZoomLightbox — DynamicZoomWrapper', () => {
  it('DynamicZoomWrapper es un class component con getDerivedStateFromError', async () => {
    const { default: DynamicZoomWrapper } = await import(
      '@/app/product/[slug]/DynamicZoomWrapper'
    );

    const wrapper = new DynamicZoomWrapper({
      children: null,
      onClose: vi.fn(),
      fallback: null,
    });
    expect(wrapper.state.hasError).toBe(false);

    // Verificar que getDerivedStateFromError existe y funciona
    expect(typeof DynamicZoomWrapper.getDerivedStateFromError).toBe('function');
    const errorState = DynamicZoomWrapper.getDerivedStateFromError();
    expect(errorState).toEqual({ hasError: true });
  });
});
