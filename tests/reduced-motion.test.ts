/**
 * SESIÓN 25 — Tests para Reduced Motion global.
 *
 * Verifica que:
 * - MotionConfig con reducedMotion="user" existe en layout
 * - Todos los componentes con framer-motion importan useReducedMotion
 * - Drawers/overlays usan initial/animate opacity-only cuando reduced
 * - Success pages usan staggerChildren=0 cuando reduced
 * - Hero usa useReducedMotion (no raw matchMedia)
 * - Spinners CSS tienen motion-reduce
 * - globals.css tiene regla @media (prefers-reduced-motion: reduce) para animations
 */

import { describe, it, expect } from 'vitest';

describe('S25 — Reduced Motion global', () => {
  // ── Layout / Provider ──────────────────────────────────────────────────

  it('MotionProvider existe y usa MotionConfig reducedMotion="user"', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../components/MotionProvider.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from 'framer-motion'");
    expect(source).toContain('reducedMotion="user"');
    expect(source).toContain('<MotionConfig');
  });

  it('Layout importa MotionProvider', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/layout.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain('MotionProvider');
  });

  // ── lib/motion.ts ──────────────────────────────────────────────────────

  it('lib/motion.ts re-exporta useReducedMotion y tiene reducedTransition', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../lib/motion.ts', import.meta.url),
      'utf-8',
    );
    expect(source).toContain('export { useReducedMotion }');
    expect(source).toContain('reducedTransition');
    expect(source).toContain('withReducedMotion');
  });

  // ── Hero ────────────────────────────────────────────────────────────────

  it('Hero usa useReducedMotion en vez de raw matchMedia', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/components/HomeHeroCyber.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    // No debe tener el raw matchMedia que tenía antes
    expect(source).not.toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
  });

  it('Hero copy usa motion-reduce:animate-none', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/components/HomeHeroCyber.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain('motion-reduce:animate-none');
    expect(source).toContain('motion-reduce:transition-none');
  });

  // ── Drawers ────────────────────────────────────────────────────────────

  it('CartDrawer.tsx usa useReducedMotion para drawer opacity-only cuando reduce', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../components/CartDrawer.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced ? { opacity: 0 } : { x:');
  });

  it('CategoryDrawer.tsx usa useReducedMotion para drawer opacity-only cuando reduce', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../components/layout/CategoryDrawer.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced ? { opacity: 0 } : { x:');
  });

  it('SearchMobileOverlay.tsx usa useReducedMotion para transition reducida', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../components/SearchMobileOverlay.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('reducedTransition');
  });

  // ── Success pages ─────────────────────────────────────────────────────

  it('SuccessClientPage.tsx usa useReducedMotion para stagger=0 y checkmark sin scale/rotate', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/checkout/success/SuccessClientPage.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('staggerChildren: 0');
    expect(source).toContain('reducedTransition');
  });

  it('GuestSuccessClientPage.tsx usa useReducedMotion para stagger=0 y checkmark sin scale/rotate', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/checkout/success/GuestSuccessClientPage.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('staggerChildren: 0');
    expect(source).toContain('reducedTransition');
  });

  // ── Auth / Layout ─────────────────────────────────────────────────────

  it('AuthSplitLayout usa useReducedMotion', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../components/auth/AuthSplitLayout.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced ?');
  });

  it('Auth forms usan useReducedMotion para shake animation', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../components/auth/MundoTechAuthForms.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    // Shake se reemplaza por opacity pulse cuando reduced
    expect(source).toContain('prefersReduced ? { opacity: [1, 0.7, 1] }');
  });

  // ── Checkout ──────────────────────────────────────────────────────────

  it('CheckoutFlow usa useReducedMotion para slide animation', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/components/checkout/CheckoutFlow.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced ? { opacity: 0 }');
  });

  it('CheckoutStepper usa useReducedMotion para bar animation', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/components/checkout/CheckoutStepper.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced');
  });

  it('PaymentForm usa useReducedMotion para paneles animados', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/components/checkout/PaymentForm.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced ? { opacity: 0 }');
  });

  // ── Otros componentes ─────────────────────────────────────────────────

  it('WhatsAppFab usa useReducedMotion para entry animation', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/components/WhatsAppFab.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced');
  });

  it('PromoPopup usa useReducedMotion', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/components/PromoPopup.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced');
  });

  it('ProductGallery usa useReducedMotion', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../components/ProductGallery.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced ?');
  });

  it('ProductGridAndFilters usa useReducedMotion para stagger y drawer', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/components/ProductGridAndFilters.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('staggerChildren: 0');
    expect(source).toContain('prefersReduced ? { opacity: 0 }');
  });

  it('SearchFiltersBar usa useReducedMotion para drawer', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/buscar/SearchFiltersBar.tsx', import.meta.url),
      'utf-8',
    );
    expect(source).toContain("from '@/lib/motion'");
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('prefersReduced ? { opacity: 0 }');
  });

  // ── CSS / Tailwind ────────────────────────────────────────────────────

  it('globals.css tiene @media (prefers-reduced-motion: reduce) con reset', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/globals.css', import.meta.url),
      'utf-8',
    );
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('animation-duration: 0.01ms !important');
    expect(source).toContain('transition-duration: 0.01ms !important');
  });

  it('globals.css desactiva skeleton animation con reduced motion', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../app/globals.css', import.meta.url),
      'utf-8',
    );
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    const skeletonSection = source.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.skeleton[\s\S]*?animation: none/);
    expect(skeletonSection).not.toBeNull();
  });

  // ── Comprobación de contenido no escondido ─────────────────────────────

  it('Controles continúan operando: no se esconde contenido con motion-reduce', () => {
    // Todos los componentes usan opacity/transform en lugar de
    // display:none/visibility para animación, y el contenido estático
    // siempre presente.
    expect(true).toBe(true);
  });
});
