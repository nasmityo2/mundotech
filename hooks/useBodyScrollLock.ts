'use client';

import { useEffect } from 'react';

let lockCount = 0;
let prevOverflow = '';

/**
 * Scroll-lock del body con contador compartido: varios overlays (drawer de
 * categorías, carrito, filtros, modales) pueden abrirse/cerrarse en cualquier
 * orden sin dejar el scroll bloqueado ni liberarlo antes de tiempo — el bug
 * clásico de `body.style.overflow = ''` pisando el lock de otro drawer.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (lockCount === 0) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [locked]);
}

export default useBodyScrollLock;
