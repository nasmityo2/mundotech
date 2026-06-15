import { Check } from 'lucide-react';
import type { ProductSpec } from '@/lib/definitions';

interface Props {
  specs: ProductSpec[];
  description: string | null;
}

function htmlToPlainText(value: string): string {
  if (!/[<>]/.test(value)) return value;
  return value
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveFromDescription(description: string | null, max = 3): string[] {
  if (!description) return [];
  const plain = htmlToPlainText(description);
  return plain
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20)
    .slice(0, max);
}

export default function ProductAboutHighlights({ specs, description }: Props) {
  const specBullets = specs.slice(0, 6).map((s) => `${s.name}: ${s.value}`);
  const bullets = specBullets.length > 0 ? specBullets : deriveFromDescription(description);

  if (bullets.length === 0) return null;

  return (
    <section className="mb-8 sm:mb-10" aria-labelledby="about-product-heading">
      <h2 id="about-product-heading" className="text-[1.15rem] sm:text-xl font-bold text-navy tracking-tight mb-3 sm:mb-4">
        Acerca de este producto
      </h2>
      <ul className="space-y-2.5">
        {bullets.map((text, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] text-slate-600 leading-snug">
            <Check size={16} className="shrink-0 mt-0.5 text-brand-yellow fill-brand-yellow/20" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
