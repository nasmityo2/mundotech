/**
 * Prompt 04 — Scroll lock iOS: pruebas del hook useBodyScrollLock.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React, { useState } from 'react';
import { useBodyScrollLock, resetBodyScrollLockForTests } from '../hooks/useBodyScrollLock';

function LockTest({ locked }: { locked: boolean }) {
  useBodyScrollLock(locked);
  return <div data-testid="lock-test" />;
}

function NestedLockTest() {
  const [outerLocked, setOuterLocked] = useState(true);
  const [innerLocked, setInnerLocked] = useState(true);
  useBodyScrollLock(outerLocked);
  useBodyScrollLock(innerLocked);
  return (
    <div>
      <button data-testid="close-inner" type="button" onClick={() => setInnerLocked(false)}>
        Close inner
      </button>
      <button data-testid="close-outer" type="button" onClick={() => setOuterLocked(false)}>
        Close outer
      </button>
    </div>
  );
}

beforeEach(() => {
  resetBodyScrollLockForTests();
  window.scrollTo = vi.fn();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
});

afterEach(() => {
  cleanup();
  resetBodyScrollLockForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useBodyScrollLock', () => {
  it('aplica position fixed, top negativo y overflow hidden al bloquear', () => {
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true });

    render(<LockTest locked={true} />);

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-120px');
    expect(document.body.style.width).toBe('100%');
  });

  it('restaura los estilos y el scroll al desbloquear', () => {
    Object.defineProperty(window, 'scrollY', { value: 240, configurable: true });

    const { unmount } = render(<LockTest locked={true} />);
    expect(document.body.style.position).toBe('fixed');

    unmount();

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(document.body.style.width).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 240);
  });

  it('locks anidados: no restaura mientras quede otro overlay activo', () => {
    Object.defineProperty(window, 'scrollY', { value: 80, configurable: true });

    const { getByTestId } = render(<NestedLockTest />);
    expect(document.body.style.position).toBe('fixed');

    act(() => {
      getByTestId('close-inner').click();
    });

    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.overflow).toBe('hidden');
    expect(window.scrollTo).not.toHaveBeenCalled();

    act(() => {
      getByTestId('close-outer').click();
    });

    expect(document.body.style.position).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 80);
  });

  it('Strict Mode: remount antes de scrollTo no pierde lockedScrollY', () => {
    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true, writable: true });

    const { unmount: unmount1 } = render(<LockTest locked={true} />);
    expect(document.body.style.top).toBe('-300px');

    unmount1();
    // Simula remount de Strict Mode antes de que el navegador aplique scrollTo.
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });

    render(<LockTest locked={true} />);
    expect(document.body.style.top).toBe('-300px');

    while (rafQueue.length > 0) {
      const cb = rafQueue.shift()!;
      cb(0);
    }
  });
});
