/**
 * SESIÓN 26/27 — Foco y modales: pruebas del hook useFocusTrap.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import React, { useRef, useState } from 'react';
import {
  useFocusTrap,
  resetFocusTrapStackForTests,
} from '../hooks/useFocusTrap';
import { jsdomFocusTrapVisibility } from '../lib/focus-trap-utils';

const trapOptions = { isVisible: jsdomFocusTrapVisibility } as const;

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

  useFocusTrap({
    containerRef: ref,
    enabled,
    focusLast,
    onClose,
    ...trapOptions,
  });

  return (
    <div>
      <button data-testid="outside" type="button">Outside</button>
      <div ref={ref} data-testid="trap-container">
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

function StackedOverlayTest() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [topOpen, setTopOpen] = useState(true);

  useFocusTrap({
    containerRef: bottomRef,
    enabled: bottomOpen,
    onClose: () => setBottomOpen(false),
    ...trapOptions,
  });
  useFocusTrap({
    containerRef: topRef,
    enabled: topOpen,
    onClose: () => setTopOpen(false),
    ...trapOptions,
  });

  return (
    <div>
      {bottomOpen && (
        <div ref={bottomRef} data-testid="bottom-trap">
          <button data-testid="bottom-btn" type="button">Bottom</button>
        </div>
      )}
      {topOpen && (
        <div ref={topRef} data-testid="top-trap">
          <button data-testid="top-btn" type="button">Top</button>
        </div>
      )}
      <span data-testid="bottom-state">{bottomOpen ? 'open' : 'closed'}</span>
      <span data-testid="top-state">{topOpen ? 'open' : 'closed'}</span>
    </div>
  );
}

afterEach(() => {
  cleanup();
  resetFocusTrapStackForTests();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useFocusTrap', () => {
  it('se monta sin errores', () => {
    expect(() => render(<FocusTrapTest />)).not.toThrow();
  });

  it('enfoca el primer elemento enfocable al abrir', () => {
    render(<FocusTrapTest />);
    expect(document.activeElement).toBe(screen.getByTestId('first-btn'));
  });

  it('enfoca el último elemento cuando focusLast=true', () => {
    render(<FocusTrapTest focusLast />);
    expect(document.activeElement).toBe(screen.getByTestId('last-btn'));
  });

  it('fallback: añade tabindex=-1 solo si no existe y lo restaura al cerrar', () => {
    render(<FocusTrapTest hideAllFocusables />);
    const container = screen.getByTestId('trap-container');
    expect(container.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(container);

    act(() => {
      screen.getByTestId('disable-btn').click();
    });

    expect(container.hasAttribute('tabindex')).toBe(false);
  });

  it('no sobrescribe tabindex existente en fallback', () => {
    function TrapWithTabindex() {
      const ref = useRef<HTMLDivElement>(null);
      useFocusTrap({ containerRef: ref, enabled: true, ...trapOptions });
      return (
        <div ref={ref} data-testid="trap-container" tabIndex={0}>
          <span>sin focusables</span>
        </div>
      );
    }

    render(<TrapWithTabindex />);
    const container = screen.getByTestId('trap-container');
    expect(container.getAttribute('tabindex')).toBe('0');
  });

  it('Escape llama onClose solo en el overlay superior del stack', () => {
    const bottomClose = vi.fn();
    const topClose = vi.fn();

    function ControlledStack() {
      const bottomRef = useRef<HTMLDivElement>(null);
      const topRef = useRef<HTMLDivElement>(null);
      useFocusTrap({
        containerRef: bottomRef,
        enabled: true,
        onClose: bottomClose,
        ...trapOptions,
      });
      useFocusTrap({
        containerRef: topRef,
        enabled: true,
        onClose: topClose,
        ...trapOptions,
      });
      return (
        <div>
          <div ref={bottomRef} data-testid="bottom-trap">
            <button type="button">Bottom</button>
          </div>
          <div ref={topRef} data-testid="top-trap">
            <button type="button">Top</button>
          </div>
        </div>
      );
    }

    render(<ControlledStack />);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(topClose).toHaveBeenCalledTimes(1);
    expect(bottomClose).not.toHaveBeenCalled();
  });

  it('stack real: Escape cierra superior y luego inferior', () => {
    render(<StackedOverlayTest />);

    expect(screen.getByTestId('top-state').textContent).toBe('open');
    expect(screen.getByTestId('bottom-state').textContent).toBe('open');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(screen.getByTestId('top-state').textContent).toBe('closed');
    expect(screen.getByTestId('bottom-state').textContent).toBe('open');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(screen.getByTestId('bottom-state').textContent).toBe('closed');
  });

  it('Tab desde el último enfocable vuelve al primero', () => {
    render(<FocusTrapTest />);
    const last = screen.getByTestId('last-btn');
    const first = screen.getByTestId('first-btn');

    act(() => {
      last.focus();
    });
    expect(document.activeElement).toBe(last);

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', bubbles: true, cancelable: true });
    });

    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab desde el primero vuelve al último', () => {
    render(<FocusTrapTest />);
    const last = screen.getByTestId('last-btn');
    const first = screen.getByTestId('first-btn');

    act(() => {
      first.focus();
    });
    expect(document.activeElement).toBe(first);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
    });

    expect(document.activeElement).toBe(last);
  });

  it('restaura foco al trigger solo si sigue conectado y enfocable', () => {
    const outside = document.createElement('button');
    outside.setAttribute('data-testid', 'trigger');
    document.body.appendChild(outside);
    outside.focus();

    const { unmount } = render(<FocusTrapTest />);
    expect(document.activeElement).not.toBe(outside);

    unmount();
    expect(document.activeElement).toBe(outside);

    outside.remove();
    resetFocusTrapStackForTests();
  });

  it('no restaura foco si el trigger fue desconectado del DOM', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    const { unmount } = render(<FocusTrapTest />);
    outside.remove();

    unmount();
    expect(document.activeElement).not.toBe(outside);
    resetFocusTrapStackForTests();
  });
});
