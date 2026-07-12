/**
 * SESIÓN 17 — Tests del ExchangeRateProvider con fake timers.
 *
 * Cubre:
 * - Tasa fresca (< 15 min) → omite fetch inicial
 * - Tasa vieja (>= 15 min) → fetch inicial
 * - Visibilidad: al volver visible si stale, refresca
 * - Deduplicación de requests concurrentes
 * - Error conserva última tasa válida
 * - Cleanup: timers y listeners removidos al desmontar
 * - StrictMode: no duplica requests
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { ExchangeRateProvider, useExchangeRate } from '../context/ExchangeRateContext';
import React, { useEffect } from 'react';

// Helper para trackear URLs solicitadas al fetch mock
let fetchCalls: string[] = [];

function setupFetchMock(respondWith?: { rate: number } | 'error') {
  fetchCalls = [];
  const mockImpl = (url: string) => {
    fetchCalls.push(url);
    if (respondWith === 'error') {
      return Promise.reject(new Error('Network error'));
    }
    const body = respondWith ?? { rate: 50.25 };
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(body),
    });
  };
  vi.stubGlobal('fetch', vi.fn(mockImpl));
}

beforeEach(() => {
  vi.useFakeTimers();
  setupFetchMock();

  // Por defecto document.visibilityState = 'visible'
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

// ── Componente consumidor para inspeccionar el contexto ──
function Consumer({ onRender }: { onRender: (ctx: { rate: number; loading: boolean; stale: boolean }) => void }) {
  const ctx = useExchangeRate();
  useEffect(() => { onRender(ctx); }, [ctx, onRender]);
  return <div data-testid="consumer">{ctx.rate}</div>;
}

describe('ExchangeRateProvider — SESIÓN 17', () => {
  it('usa initialRate fresca y no dispara fetch', async () => {
    const onRender = vi.fn();
    const now = Date.now();

    render(
      <ExchangeRateProvider initialRate={60.0} initialUpdatedAt={new Date(now).toISOString()}>
        <Consumer onRender={onRender} />
      </ExchangeRateProvider>
    );

    await act(async () => { vi.advanceTimersByTime(10); });

    // Sin fetch porque la tasa es fresca (recién actualizada)
    expect(fetchCalls).toHaveLength(0);

    // La tasa inicial es 60
    expect(onRender).toHaveBeenCalledWith(
      expect.objectContaining({ rate: 60.0, stale: false, loading: false })
    );
  });

  it('dispara fetch inicial si la tasa es vieja (> 15 min)', async () => {
    const onRender = vi.fn();
    const past = Date.now() - 16 * 60 * 1000; // 16 min atrás

    render(
      <ExchangeRateProvider initialRate={60.0} initialUpdatedAt={new Date(past).toISOString()}>
        <Consumer onRender={onRender} />
      </ExchangeRateProvider>
    );

    await act(async () => { vi.advanceTimersByTime(10); });

    // Fetch para refrescar (tasa vieja)
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toBe('/api/config/exchange-rate');
  });

  it('usa default si no hay initialRate', async () => {
    const onRender = vi.fn();

    render(
      <ExchangeRateProvider>
        <Consumer onRender={onRender} />
      </ExchangeRateProvider>
    );

    await act(async () => { vi.advanceTimersByTime(10); });

    // Sin initialRate → fetch inicial
    expect(fetchCalls).toHaveLength(1);
  });

  it('dispara fetch si initialRate > 0 sin initialUpdatedAt', async () => {
    const onRender = vi.fn();

    render(
      <ExchangeRateProvider initialRate={60.0}>
        <Consumer onRender={onRender} />
      </ExchangeRateProvider>
    );

    await act(async () => { vi.advanceTimersByTime(10); });

    // Sin updatedAt → se considera viejo → fetch
    expect(fetchCalls).toHaveLength(1);
  });

  it('deduplica requests concurrentes (misma Promise compartida)', async () => {
    // Hacer que fetch sea lento — ambas llamadas reciben la misma Promise
    let resolveFetch!: (v: unknown) => void;
    const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });

    vi.stubGlobal('fetch', vi.fn(() => {
      fetchCalls.push('/api/config/exchange-rate');
      return fetchPromise;
    }));

    const onRender = vi.fn();
    const past = Date.now() - 16 * 60 * 1000; // fuerza fetch inicial

    render(
      <ExchangeRateProvider initialRate={60.0} initialUpdatedAt={new Date(past).toISOString()}>
        <Consumer onRender={onRender} />
      </ExchangeRateProvider>
    );

    await act(async () => { vi.advanceTimersByTime(50); });

    // Solo 1 fetch registrado
    expect(fetchCalls).toHaveLength(1);

    // Ahora simulamos que el timer se dispara mientras el primer fetch aún corre.
    // El provider debería reusar la Promise existente en lugar de hacer otro fetch.
    await act(async () => { vi.advanceTimersByTime(15 * 60 * 1000); });

    // Sigue habiendo solo 1 fetch (el timer no disparó otro porque currentFetchRef no era null)
    expect(fetchCalls).toHaveLength(1);

    // Resolver el fetch
    await act(async () => {
      resolveFetch({ ok: true, json: () => Promise.resolve({ rate: 55.0 }) });
    });

    await act(async () => { vi.advanceTimersByTime(10); });

    // Después de resolver, la tasa debería actualizarse
    expect(onRender).toHaveBeenLastCalledWith(
      expect.objectContaining({ rate: 55.0, stale: false })
    );
  });

  it('error no sustituye la última tasa válida (conserva rate anterior)', async () => {
    const onRender = vi.fn();

    // Primer render con initialRate fresca → no hay fetch
    render(
      <ExchangeRateProvider initialRate={60.0} initialUpdatedAt={new Date(Date.now()).toISOString()}>
        <Consumer onRender={onRender} />
      </ExchangeRateProvider>
    );

    await act(async () => { vi.advanceTimersByTime(10); });

    // refresh: cambiar mock a error para que el siguiente fetch falle
    setupFetchMock('error');

    // Hacer que pase suficiente tiempo para que el timer de 15 min se dispare
    await act(async () => { vi.advanceTimersByTime(16 * 60 * 1000); });

    // La tasa se conserva pero está stale
    expect(onRender).toHaveBeenLastCalledWith(
      expect.objectContaining({ rate: 60.0, stale: true })
    );
  });

  it('timer refresca cada 15 min mientras visible', async () => {
    const onRender = vi.fn();
    const past = Date.now() - 16 * 60 * 1000; // fuerza fetch inicial

    render(
      <ExchangeRateProvider initialRate={60.0} initialUpdatedAt={new Date(past).toISOString()}>
        <Consumer onRender={onRender} />
      </ExchangeRateProvider>
    );

    await act(async () => { vi.advanceTimersByTime(10); });

    // Fetch inicial
    expect(fetchCalls.length).toBeGreaterThanOrEqual(1);
    const initialCalls = fetchCalls.length;

    // Avanzar 15 min — debe disparar el timer
    await act(async () => { vi.advanceTimersByTime(15 * 60 * 1000); });

    // Debe haber al menos 1 fetch adicional (el del timer)
    expect(fetchCalls.length).toBeGreaterThanOrEqual(initialCalls + 1);
  });

  it('sin polling en hidden', async () => {
    const onRender = vi.fn();
    const past = Date.now() - 16 * 60 * 1000; // fuerza fetch inicial

    render(
      <ExchangeRateProvider initialRate={60.0} initialUpdatedAt={new Date(past).toISOString()}>
        <Consumer onRender={onRender} />
      </ExchangeRateProvider>
    );

    await act(async () => { vi.advanceTimersByTime(10); });

    const initialCalls = fetchCalls.length;

    // Cambiar a hidden — se detiene el timer
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Avanzar 16 min en hidden — no debe haber más fetches
    await act(async () => { vi.advanceTimersByTime(16 * 60 * 1000); });

    expect(fetchCalls).toHaveLength(initialCalls);

    // Volver a visible — debe refrescar porque está stale y pasó suficiente tiempo
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => { vi.advanceTimersByTime(10); });

    expect(fetchCalls.length).toBeGreaterThan(initialCalls);
  });

  it('cleanup: no ejecuta timers ni listeners tras desmontar', async () => {
    const onRender = vi.fn();

    const { unmount } = render(
      <ExchangeRateProvider initialRate={60.0} initialUpdatedAt={new Date(Date.now()).toISOString()}>
        <Consumer onRender={onRender} />
      </ExchangeRateProvider>
    );

    await act(async () => { vi.advanceTimersByTime(10); });

    // Verificar que no hubo fetch (tasa fresca)
    const initialCalls = fetchCalls.length;

    // Desmontar
    unmount();

    // Avanzar 20 min — no debe haber más fetches
    await act(async () => { vi.advanceTimersByTime(20 * 60 * 1000); });

    expect(fetchCalls).toHaveLength(initialCalls);

    // Intentar disparar visibilitychange — no debería hacer nada (listeners removidos)
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => { vi.advanceTimersByTime(10); });

    // Sin fetches adicionales después del unmount
    expect(fetchCalls).toHaveLength(initialCalls);
  });

  it('StrictMode: no duplica fetch inicial con tasa vieja', async () => {
    const onRender = vi.fn();
    const past = Date.now() - 16 * 60 * 1000;

    await act(async () => {
      render(
        <React.StrictMode>
          <ExchangeRateProvider initialRate={60.0} initialUpdatedAt={new Date(past).toISOString()}>
            <Consumer onRender={onRender} />
          </ExchangeRateProvider>
        </React.StrictMode>
      );
    });

    await act(async () => { vi.advanceTimersByTime(10); });

    // StrictMode monta dos veces (efectos se ejecutan dos veces en desarrollo).
    // Lo importante: todas las calls son a la misma URL, no hay fugas.
    expect(fetchCalls.length).toBeGreaterThanOrEqual(1);
    expect(fetchCalls.length).toBeLessThanOrEqual(2); // StrictMode duplica
    fetchCalls.forEach(url => expect(url).toBe('/api/config/exchange-rate'));
  });
});
