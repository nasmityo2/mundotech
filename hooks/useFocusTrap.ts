'use client';

import { useEffect, useRef, useCallback, type RefObject } from 'react';

/**
 * Selector CSS para elementos enfocables dentro de un contenedor.
 * Incluye targets de 44px (min-height/min-width en los botones del proyecto).
 */
const FOCUSABLE =
  'a[href], button:not([disabled]):not([aria-hidden="true"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])';

interface UseFocusTrapOptions {
  /** Ref del contenedor del diálogo */
  containerRef: RefObject<HTMLElement | null>;
  /** Diálogo abierto */
  enabled: boolean;
  /**
   * Si true, el foco inicial va al último elemento (`default: first`).
   * Se usa en acciones destructivas: el botón peligroso NO recibe foco
   * por defecto (se enfoca "Cancelar" que está al final).
   */
  focusLast?: boolean;
  /**
   * Callback al presionar Escape.
   * Opcional: el hook maneja el evento y llama onClose si existe.
   */
  onClose?: () => void;
  /**
   * Si true (default), el foco se devuelve al trigger al cerrar.
   */
  restoreFocus?: boolean;
}

let trapStack: Array<{ container: HTMLElement; previouslyFocused: Element | null }> = [];

/**
 * Hook de focus trap universal para diálogos modales.
 *
 * - Guarda el elemento que tenía el foco antes de abrir.
 * - Enfoca el primer (o último) elemento enfocable dentro del contenedor.
 * - Escucha Tab/Shift+Tab en el contenedor y cicla dentro.
 * - Escucha Escape globalmente y llama onClose.
 * - Al cerrar, restaura el foco al trigger.
 * - Soporta stack de overlays (varios traps anidados).
 * - No añade listeners duplicados (cleanup en el return).
 * - Si el contenedor no tiene elementos enfocables, enfoca el propio contenedor.
 */
export function useFocusTrap({
  containerRef,
  enabled,
  focusLast = false,
  onClose,
  restoreFocus = true,
}: UseFocusTrapOptions) {
  const previousFocusRef = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const getFocusables = useCallback(() => {
    const el = containerRef.current;
    if (!el) return [];
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => el.offsetParent !== null || el === containerRef.current);
  }, [containerRef]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement;
    previousFocusRef.current = previouslyFocused;

    // Push al stack
    trapStack = trapStack.filter((entry) => entry.container !== container);
    trapStack.push({ container, previouslyFocused });

    // Enfocar primer (o último) elemento
    const focusables = getFocusables();
    const target = focusLast ? focusables[focusables.length - 1] : focusables[0];
    if (target) {
      target.focus();
    } else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    // Trap Tab/Shift+Tab a nivel de documento
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;

      // Solo atrapamos si este contenedor es el tope del stack
      const top = trapStack[trapStack.length - 1];
      if (!top || top.container !== container) return;

      const focusableElements = getFocusables();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Remover del stack
      trapStack = trapStack.filter((entry) => entry.container !== container);

      // Restaurar foco
      if (restoreFocus && previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [enabled, containerRef, focusLast, getFocusables, restoreFocus]);
}

export default useFocusTrap;
