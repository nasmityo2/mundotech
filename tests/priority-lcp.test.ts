/**
 * SESIÓN 18 — Prioridad LCP única
 *
 * Verifica que solo el hero inicial usa priority/preload en la home.
 * Estas pruebas revisan el código fuente (no DOM renderizado) para
 * confirmar que no se pasan valores `priority=true` no autorizados.
 *
 * Pruebas:
 *   - page.tsx: priorityFirstItems={0} en todos los ProductShelf
 *   - page.tsx: HomeHeroCyber recibe priorityImages={true} (fijo)
 *   - PromoBanners.tsx: sin lógica de priorización — priority={false}
 *   - Navbar Logo: no recibe priority
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '..');

function readSource(relative: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relative), 'utf-8');
}

describe('Sesión 18 — Prioridad LCP única', () => {
  describe('app/page.tsx', () => {
    const source = readSource('app/page.tsx');

    it('HomeHeroCyber recibe priorityImages={true} (fijo, no condicional)', () => {
      // Debe ser el literal `true`, no una expresión que pueda evaluar a false
      const match = source.match(/priorityImages=\{(true|false|promoBanners\.length\s*===\s*0)\}/);
      expect(match).not.toBeNull();
      // El valor debe ser `true`, no una expresión condicional
      expect(match![1]).toBe('true');
    });

    it('flash deals shelf NO tiene priorityFirstItems > 0', () => {
      // Buscar el bloque de "Ofertas del Día" con priorityFirstItems
      const shelfBlock = source.match(
        /badge="Ofertas"[\s\S]*?priorityFirstItems=\{(\d+)\}/
      );
      expect(shelfBlock).not.toBeNull();
      expect(Number(shelfBlock![1])).toBe(0);
    });

    it('novedades shelf NO tiene priorityFirstItems > 0', () => {
      const shelfBlock = source.match(
        /badge=\{novedadesBadge\}[\s\S]*?priorityFirstItems=\{(\d+)\}/
      );
      // Puede tener priorityFirstItems explícito u omitido (default 0)
      if (shelfBlock) {
        expect(Number(shelfBlock[1])).toBe(0);
      }
    });

    it('ningún ProductShelf en page.tsx usa priorityFirstItems > 0', () => {
      // Recolectar todos los priorityFirstItems={N} donde N > 0
      const regex = /priorityFirstItems=\{(\d+)\}/g;
      let match;
      const found = new Set<number>();
      while ((match = regex.exec(source)) !== null) {
        found.add(Number(match[1]));
      }
      const nonZero = [...found].filter((n) => n > 0);
      expect(nonZero).toEqual([]);
    });
  });

  describe('PromoBanners.tsx', () => {
    const source = readSource('app/components/PromoBanners.tsx');

    it('NO contiene función shouldPrioritizePromoBanner', () => {
      expect(source).not.toContain('shouldPrioritizePromoBanner');
    });

    it('NO contiene la palabra gaming en lógica de prioridad (era un caso)', () => {
      // Antes priorizaba si el título contenía "gaming"
      expect(source).not.toMatch(/gaming/i);
    });

    it('PromoBannerCard recibe priority={false}', () => {
      const match = source.match(/priority=\{false\}/g);
      expect(match).not.toBeNull();
      // Debe haber al menos una ocurrencia de priority={false}
      expect(match!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Navbar.tsx — Logo sin priority', () => {
    const source = readSource('components/Navbar.tsx');

    it('Logo no recibe prop priority (usa default=false)', () => {
      // Buscar la línea que renderiza Logo en Navbar
      const logoLines = source
        .split('\n')
        .filter((l) => l.includes('Logo'));
      // Ninguna línea que llame a Logo debe contener "priority"
      for (const line of logoLines) {
        // Si es un import o definición de tipo, ignorar
        if (line.includes('import') || line.includes('interface')) continue;
        expect(line).not.toMatch(/\bpriority\b/);
      }
    });
  });

  describe('HomeHeroCyber.tsx — solo slide 0 con priority', () => {
    const source = readSource('app/components/HomeHeroCyber.tsx');

    it('dentro del map de slides, solo i===0 recibe priority', () => {
      // Buscar priority={priorityImages && i === 0} — la condición correcta
      expect(source).toContain('priority={priorityImages && i === 0}');
    });

    it('fetchPriority solo se asigna a slide 0', () => {
      expect(source).toContain("fetchPriority={priorityImages && i === 0 ? 'high' : 'auto'}");
    });
  });
});
