'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const DEFAULT_RATE = Number(process.env.NEXT_PUBLIC_BS_RATE ?? '36.5');

interface ExchangeRateContextType {
  rate: number;
  loading: boolean;
}

const ExchangeRateContext = createContext<ExchangeRateContextType>({
  rate: DEFAULT_RATE,
  loading: false,
});

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate]       = useState(DEFAULT_RATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config/exchange-rate')
      .then(r => r.json())
      .then(data => {
        if (typeof data.rate === 'number' && data.rate > 0) setRate(data.rate);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ExchangeRateContext.Provider value={{ rate, loading }}>
      {children}
    </ExchangeRateContext.Provider>
  );
}

export function useExchangeRate() {
  return useContext(ExchangeRateContext);
}
