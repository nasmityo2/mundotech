'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Truck, X } from 'lucide-react';
import { formatOrderDualInline } from '@/lib/order-pricing';

interface NewOrder {
  id:           string;
  orderNumber:  number;
  customerName: string;
  total:        number;
  exchangeRateUsdBs?: number | null;
  createdAt:    string;
  status:       string;
}

const STORAGE_KEY      = 'mt-admin-orders-since';
const ENABLED_KEY      = 'mt-admin-orders-notify';
const POLL_INTERVAL_MS = 25_000;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatOrderTotal = (o: Pick<NewOrder, 'total' | 'exchangeRateUsdBs'>) =>
  formatOrderDualInline(o.total, o);

/**
 * Vigila pedidos nuevos cada 25s y muestra:
 * - Toast in-app con sonido + vibración
 * - Notificación nativa del navegador (si el usuario lo permitió)
 * - Botón flotante para silenciar/activar (persiste en localStorage)
 */
export default function NewOrdersWatcher() {
  const [enabled, setEnabled] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<NewOrder[]>([]);
  const [showToast, setShowToast] = useState(false);
  const sinceRef = useRef<string>(new Date().toISOString());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cargar estado persistido
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) sinceRef.current = stored;
    const enabledStored = localStorage.getItem(ENABLED_KEY);
    if (enabledStored !== null) setEnabled(enabledStored === '1');
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }

    // Beep WAV embebido (1 kHz, 250 ms) para no depender de un asset externo
    audioRef.current = new Audio(
      'data:audio/wav;base64,UklGRpQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YXAGAACA' +
      'gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA' +
      'gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIB/' +
      'gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA',
    );
  }, []);

  // Persistir enabled
  useEffect(() => {
    localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  }, [enabled]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setHasPermission(result === 'granted');
  };

  const playAlert = () => {
    if (!enabled) return;
    if (audioRef.current) audioRef.current.play().catch(() => {});
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([200, 100, 200]);
    }
  };

  const showNativeNotification = (orders: NewOrder[]) => {
    if (!hasPermission || !('Notification' in window)) return;
    const main = orders[0];
    new Notification(`🛒 ${orders.length} pedido${orders.length !== 1 ? 's' : ''} nuevo${orders.length !== 1 ? 's' : ''}`, {
      body: `${main.customerName} · #${String(main.orderNumber).padStart(4, '0')} · ${formatOrderTotal(main)}`,
      tag: 'mt-new-order',
      icon: '/icon.svg',
      badge: '/icon.svg',
    });
  };

  // Polling
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/new-count?since=${encodeURIComponent(sinceRef.current)}`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data: { count: number; latest: NewOrder[] } = await res.json();

        const trulyNew = data.latest.filter(o => !seenIdsRef.current.has(o.id));
        if (trulyNew.length > 0) {
          trulyNew.forEach(o => seenIdsRef.current.add(o.id));
          setPendingOrders(prev => [...trulyNew, ...prev].slice(0, 5));
          setShowToast(true);
          playAlert();
          showNativeNotification(trulyNew);
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasPermission]);

  const acknowledge = () => {
    setShowToast(false);
    setPendingOrders([]);
    sinceRef.current = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, sinceRef.current);
  };

  return (
    <>
      {/* Botón flotante de toggle (solo en admin, sobre el bottom-nav móvil) */}
      <div
        className="fixed right-3 z-30 md:bottom-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+12px)]"
      >
        <button
          type="button"
          onClick={() => {
            if (!hasPermission && !enabled) requestPermission();
            setEnabled(!enabled);
          }}
          aria-label={enabled ? 'Silenciar notificaciones' : 'Activar notificaciones'}
          title={enabled ? 'Notificaciones activas' : 'Notificaciones silenciadas'}
          className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full shadow-lg border-2 transition ${
            enabled
              ? 'bg-brand-yellow border-yellow-400 text-navy active:scale-95'
              : 'bg-white border-gray-200 text-gray-400 active:bg-gray-100'
          }`}
        >
          {enabled ? <Bell size={18} /> : <BellOff size={18} />}
        </button>
      </div>

      {/* Toast in-app de pedidos nuevos */}
      {showToast && pendingOrders.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed inset-x-3 sm:right-4 sm:left-auto z-40 md:bottom-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+12px)] sm:w-[360px] bg-white border-2 border-brand-yellow rounded-2xl shadow-2xl overflow-hidden animate-slideIn"
        >
          <div className="flex items-center justify-between px-3 py-2.5 bg-brand-yellow/30 border-b border-brand-yellow/30">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-yellow text-navy flex items-center justify-center">
                <Truck size={14} />
              </span>
              <p className="text-xs font-black text-navy uppercase tracking-wide">
                {pendingOrders.length} pedido{pendingOrders.length !== 1 ? 's' : ''} nuevo{pendingOrders.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={acknowledge}
              className="w-9 h-9 inline-flex items-center justify-center text-gray-500 active:bg-black/10 rounded-full"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
          <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {pendingOrders.map(o => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  onClick={acknowledge}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 active:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">
                      #{String(o.orderNumber).padStart(4, '0')} · {o.customerName}
                    </p>
                    <p className="text-[11px] text-gray-500">{formatTime(o.createdAt)}</p>
                  </div>
                  <p className="text-sm font-bold text-navy tabular-nums whitespace-nowrap flex-shrink-0">
                    {formatOrderTotal(o)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
