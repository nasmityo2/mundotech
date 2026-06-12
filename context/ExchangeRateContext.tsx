'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

const DEFAULT_RATE    = Number(process.env.NEXT_PUBLIC_BS_RATE ?? '36.5');
const REFRESH_INTERVAL = 60_000; // re-fetch every 60 s so rate changes propagate quickly

interface ExchangeRateContextType {
  rate: number;
  loading: boolean;
  /**
   * PRD-099/PRD-215: true mientras la tasa mostrada NO proviene de la API
   * (fallback inicial o último fetch fallido). La UI que muestre Bs puede
   * marcar el monto como estimado.
   */
  stale: boolean;
}

const ExchangeRateContext = createContext<ExchangeRateContextType>({
  rate: DEFAULT_RATE,
  loading: false,
  stale: true,
});

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate]       = useState(DEFAULT_RATE);
  const [loading, setLoading] = useState(true);
  const [stale, setStale]     = useState(true);

  const fetchRate = useCallback(() => {
    fetch('/api/config/exchange-rate')
      .then(r => r.json())
      .then(data => {
        if (typeof data.rate === 'number' && data.rate > 0) {
          setRate(data.rate);
          setStale(false);
        } else {
          setStale(true);
        }
      })
      .catch((err) => {
        console.error('[ExchangeRateContext] Error al obtener tasa USD/Bs:', err);
        setStale(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRate();
    const id = setInterval(fetchRate, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchRate]);

  return (
    <ExchangeRateContext.Provider value={{ rate, loading, stale }}>
      {children}
    </ExchangeRateContext.Provider>
  );
}

export function useExchangeRate() {
  return useContext(ExchangeRateContext);
}
