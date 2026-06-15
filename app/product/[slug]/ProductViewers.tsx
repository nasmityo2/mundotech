'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

interface ProductViewersProps {
  productId: string;
}

/** Hash determinista → base estable 18–120 (mismo valor en SSR e hidratación). */
function viewersFromProductId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return 18 + (Math.abs(hash) % 103);
}

function clampViewers(n: number): number {
  return Math.max(15, Math.min(125, n));
}

export default function ProductViewers({ productId }: ProductViewersProps) {
  const [count, setCount] = useState(() => viewersFromProductId(productId));

  useEffect(() => {
    const tick = () => {
      setCount((prev) => {
        const delta = Math.floor(Math.random() * 3) + 1; // 1–3
        const sign = Math.random() < 0.5 ? -1 : 1;
        return clampViewers(prev + sign * delta);
      });
    };

    const schedule = () => {
      const delay = 4000 + Math.floor(Math.random() * 4000); // 4–8s
      return window.setTimeout(() => {
        tick();
        timerId = schedule();
      }, delay);
    };

    let timerId = schedule();
    return () => window.clearTimeout(timerId);
  }, [productId]);

  return (
    <div
      className="mt-5 flex items-center gap-2.5 rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-2.5"
      aria-live="polite"
      aria-atomic="true"
    >
      <Eye size={16} className="shrink-0 text-sky-600" aria-hidden />
      <p className="text-[13px] leading-snug text-sky-900">
        <span className="font-bold nums">{count}</span>{' '}
        personas viendo este producto ahora
      </p>
    </div>
  );
}
