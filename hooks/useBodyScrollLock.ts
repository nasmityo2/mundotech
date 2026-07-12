'use client';

import { useEffect } from 'react';

let lockCount = 0;
let prevOverflow = '';
let prevPaddingRight = '';

/**
 * Scroll-lock del body con contador compartido: varios overlays (drawer de
 * categorías, carrito, filtros, modales) pueden abrirse/cerrarse en cualquier
 * orden sin dejar el scroll bloqueado ni liberarlo antes de tiempo — el bug
 * clásico de `body.style.overflow = ''` pisando el lock de otro drawer.
 *
 * Compensa el scrollbar añadiendo paddingRight para evitar salto de layout
 * al ocultar la barra de scroll. Restaura el padding original al liberar.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (lockCount === 0) {
      prevOverflow = document.body.style.overflow;
      prevPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPaddingRight;
      }
    };
  }, [locked]);
}

export default useBodyScrollLock;
