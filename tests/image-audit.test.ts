import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('IMAGE-AUDIT.md existe y tiene contenido', () => {
  const auditPath = path.resolve(__dirname, '../docs/IMAGE-AUDIT.md');

  it('existe el archivo de auditoría', () => {
    expect(fs.existsSync(auditPath)).toBe(true);
  });

  it('tiene contenido no vacío', () => {
    const content = fs.readFileSync(auditPath, 'utf-8');
    expect(content.length).toBeGreaterThan(500);
  });

  it('cubre las 16 instancias de <img> según el inventario actual', () => {
    const content = fs.readFileSync(auditPath, 'utf-8');
    const totalMatch = content.match(/Total `<img>` encontrados:\*\* (\d+)/);
    expect(totalMatch).not.toBeNull();
    expect(Number(totalMatch![1])).toBe(16);
    const numberedItems = content.match(/\| \d+ \|/g);
    expect(numberedItems).not.toBeNull();
    expect(numberedItems!.length).toBe(16);
  });

  it('incluye secciones de decisión y mejoras aplicadas', () => {
    const content = fs.readFileSync(auditPath, 'utf-8');
    expect(content).toContain('Decisiones globales');
    expect(content).toContain('Mejoras aplicadas');
  });
});

describe('ningún <img> sin referrerPolicy para contenido externo/privado', () => {
  const filesToCheck = [
    'app/components/checkout/PaymentForm.tsx',
    'app/admin/orders/[id]/page.tsx',
    'components/admin/PaymentVerificationPanel.tsx',
  ];

  function hasReferrerPolicy(content: string): boolean {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<img')) {
        // Collect the full multi-line img tag block
        let block = lines[i];
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
          if (lines[j - 1].includes('/>') || lines[j - 1].trim().endsWith('>')) break;
          block += lines[j];
        }
        // Blob URLs and aria-hidden decorative images don't need referrerPolicy
        if (block.includes('proofPreviewUrl') || block.includes('aria-hidden')) continue;
        if (!block.includes('referrerPolicy') && !block.includes('referrerpolicy')) {
          return false;
        }
      }
    }
    return true;
  }

  for (const file of filesToCheck) {
    it(`${file} tiene referrerPolicy en <img> externo/privado`, () => {
      const fullPath = path.resolve(__dirname, '..', file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(hasReferrerPolicy(content)).toBe(true);
    });
  }
});

describe('todos los <img> conocidos alt adecuado', () => {
  const filesWithImg = [
    { file: 'app/components/checkout/PaymentForm.tsx', count: 3 },
    { file: 'app/components/checkout/ReviewStep.tsx', count: 1 },
    { file: 'app/components/AddProductModal.tsx', count: 1 },
    { file: 'app/admin/orders/[id]/page.tsx', count: 1 },
    { file: 'app/admin/reviews/page.tsx', count: 2 },
    { file: 'components/admin/PaymentVerificationPanel.tsx', count: 2 },
    { file: 'app/product/[slug]/ProductReviews.tsx', count: 3 },
    { file: 'app/product/[slug]/ProductGallery.tsx', count: 2 },
    { file: 'app/product/[slug]/ZoomLightbox.tsx', count: 1 },
  ];

  for (const { file } of filesWithImg) {
    it(`${file}: todos los <img> tienen alt (incluso vacío)`, () => {
      const fullPath = path.resolve(__dirname, '..', file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Find all <img occurrences and check they have alt=
      const lines = content.split('\n');
      let currentLine = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('<img')) {
          currentLine = line;
          // Multi-line img tag: collect next lines
          let j = i + 1;
          while (j < lines.length && !lines[j - 1].includes('/>') && !lines[j - 1].includes('>')) {
            currentLine += lines[j];
            j++;
          }
          expect(currentLine).toMatch(/alt=/);
        }
      }
    });
  }
});

describe('ningún host externo añadido a remotePatterns sin justificación', () => {
  const configPath = path.resolve(__dirname, '../next.config.mjs');
  const content = fs.readFileSync(configPath, 'utf-8');

  it('remotePatterns solo contiene R2 público', () => {
    // Count how many patterns are defined
    const patternMatches = content.match(/hostname:/g) || [];
    // Should only contain R2 public URL pattern (max 1)
    expect(patternMatches.length).toBeLessThanOrEqual(1);
  });

  it('no hay hostnames de terceros en remotePatterns', () => {
    expect(content).not.toContain('binance');
    expect(content).not.toContain('whatsapp');
    expect(content).not.toContain('telegram');
  });
});

describe('checkout proof previews usan blob URLs y no persisten', () => {
  it('PaymentForm usa URL.createObjectURL para preview', () => {
    const paymentFormPath = path.resolve(__dirname, '../app/components/checkout/PaymentForm.tsx');
    const content = fs.readFileSync(paymentFormPath, 'utf-8');
    expect(content).toContain('URL.createObjectURL');
    expect(content).toContain('URL.revokeObjectURL');
  });

  it('proofPreviewUrl se muestra con <img> (no next/image)', () => {
    const reviewStepPath = path.resolve(__dirname, '../app/components/checkout/ReviewStep.tsx');
    const content = fs.readFileSync(reviewStepPath, 'utf-8');
    // The proof preview uses raw <img> not next/image
    const proofPreviewSection = content.substring(
      content.indexOf('proofPreviewUrl'),
      content.indexOf('proofPreviewUrl') + 300,
    );
    // Should contain `no-img-element` eslint disable (raw img)
    expect(proofPreviewSection).toContain('no-img-element');
  });
});

describe('documentación de auditoría de imágenes', () => {
  it('docs/IMAGE-AUDIT.md existe y documenta', () => {
    const auditPath = path.resolve(__dirname, '../docs/IMAGE-AUDIT.md');
    expect(fs.existsSync(auditPath)).toBe(true);
  });

  it('cubre decisiones blob, privado, zoom y público', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../docs/IMAGE-AUDIT.md'),
      'utf-8',
    );
    expect(content).toContain('Blob');
    expect(content).toContain('privado');
    expect(content).toContain('zoom');
    expect(content).toContain('público');
  });

  it('no afirma que CSP ya permite hosts externos arbitrarios', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../docs/IMAGE-AUDIT.md'),
      'utf-8',
    );
    expect(content).toContain('No');
    expect(content).not.toMatch(/CSP existente las maneja via `img-src`/);
    expect(content).toContain('buildImgSrc');
  });

  it('lista qué archivos ya usan next/image correctamente', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../docs/IMAGE-AUDIT.md'),
      'utf-8',
    );
    expect(content).toContain('next/image');
  });
});
