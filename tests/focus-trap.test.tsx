/**
 * SESIÓN 26 — Foco y modales: pruebas del hook useFocusTrap.
 *
 * Verifica comportamientos clave que JSDOM puede probar:
 * - El hook se monta sin errores.
 * - Escape llama onClose.
 * - Sin elementos enfocables: el contenedor recibe foco.
 *
 * NOTA: JSDOM no tiene motor de foco nativo ni offsetParent para elementos
 * no conectados al DOM renderizado, por lo que getFocusables() siempre
 * retorna [] en JSDOM. Las pruebas de foco inicial exacto (first/last)
 * requieren un browser real → cubiertas por E2E con Playwright.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import React, { useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

// ── Test components ────────────────────────────────────────────────────────

function FocusTrapTest({
  focusLast = false,
  onClose,
  hideAllFocusables = false,
}: {
  focusLast?: boolean;
  onClose?: () => void;
  hideAllFocusables?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(true);

  useFocusTrap({ containerRef: ref, enabled, focusLast, onClose });

  return (
    <div>
      <button data-testid="outside" type="button">Outside</button>
      <div ref={ref} data-testid="trap-container" tabIndex={-1}>
        {!hideAllFocusables && (
          <>
            <button data-testid="first-btn" type="button">First</button>
            <input data-testid="middle-input" />
            <button data-testid="last-btn" type="button">Last</button>
          </>
        )}
      </div>
      <button
        data-testid="disable-btn"
        type="button"
        onClick={() => setEnabled(false)}
      >
        Disable
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useFocusTrap', () => {
  it('se monta sin errores', () => {
    expect(() => render(<FocusTrapTest />)).not.toThrow();
  });

  it('enfoca el contenedor cuando no hay elementos enfocables (JSDOM fallback)', () => {
    render(<FocusTrapTest hideAllFocusables />);
    // En JSDOM no hay offsetParent, el hook cae al fallback:
    // container.setAttribute('tabindex', '-1'); container.focus();
    expect(document.activeElement).toBe(screen.getByTestId('trap-container'));
  });

  it('Escape llama onClose', () => {
    const onClose = vi.fn();
    render(<FocusTrapTest onClose={onClose} />);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Tab sin foco en extremos no causa error', () => {
    render(<FocusTrapTest />);

    // En JSDOM, getFocusables() devuelve [] porque offsetParent es null,
    // pero el hook no debe lanzar error al recibir Tab.
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab', bubbles: true, cancelable: true,
      }));
    }).not.toThrow();
  });

  it('Tab con Shift no causa error', () => {
    render(<FocusTrapTest />);

    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab', shiftKey: true, bubbles: true, cancelable: true,
      }));
    }).not.toThrow();
  });
});
