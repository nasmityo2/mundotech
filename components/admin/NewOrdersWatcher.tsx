'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
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

/*
 * PRD-265: las claves de localStorage van sufijadas por operador (user id).
 * En un PC de mostrador compartido por varios admins, el "visto hasta" y el
 * mute de notificaciones de un operador no pisan los del siguiente.
 */
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
  const { data: session } = useSession();
  const operatorId = session?.user?.id ?? null;
  const sinceKey   = operatorId ? `${STORAGE_KEY}:${operatorId}`  : null;
  const enabledKey = operatorId ? `${ENABLED_KEY}:${operatorId}`  : null;

  const [enabled, setEnabled] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<NewOrder[]>([]);
  const [showToast, setShowToast] = useState(false);
  const sinceRef = useRef<string>(new Date().toISOString());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cargar estado persistido del operador actual (PRD-265)
  useEffect(() => {
    if (!sinceKey || !enabledKey) return;
    const stored = localStorage.getItem(sinceKey);
    if (stored) sinceRef.current = stored;
    const enabledStored = localStorage.getItem(enabledKey);
    if (enabledStored !== null) setEnabled(enabledStored === '1');
  }, [sinceKey, enabledKey]);

  useEffect(() => {
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

  // Persistir enabled (por operador — PRD-265)
  useEffect(() => {
    if (!enabledKey) return;
    localStorage.setItem(enabledKey, enabled ? '1' : '0');
  }, [enabled, enabledKey]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setHasPermission(result === 'granted');
  };

  const playAlert = (count = 1) => {
    if (!enabled) return;
    // Un beep por cada pedido nuevo (máx. 6 para no saturar), espaciados 350 ms.
    const beeps = Math.min(Math.max(count, 1), 6);
    let played = 0;
    const beepOnce = () => {
      const a = audioRef.current;
      if (a) {
        try { a.currentTime = 0; } catch {}
        a.play().catch(() => {});
      }
      played++;
      if (played < beeps) setTimeout(beepOnce, 350);
    };
    beepOnce();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([200, 100, 200]);
    }
  };

  const showNativeNotification = (orders: NewOrder[]) => {
    if (!hasPermission || !('Notification' in window)) return;
    const main = orders[0];
    // PRD-227: la notificación del sistema operativo persiste en el centro de
    // notificaciones y se ve en pantalla bloqueada → solo número de pedido,
    // sin nombre de cliente ni montos. El detalle vive en el toast in-app.
    new Notification(`🛒 ${orders.length} pedido${orders.length !== 1 ? 's' : ''} nuevo${orders.length !== 1 ? 's' : ''}`, {
      body: `Pedido #${String(main.orderNumber).padStart(4, '0')}${orders.length > 1 ? ` y ${orders.length - 1} más` : ''} · abre el panel para ver el detalle`,
      tag: 'mt-new-order',
      icon: '/icon.svg',
      badge: '/icon.svg',
    });
  };

  // Polling
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      // PRD-230: con la pestaña oculta no se gasta batería/datos del admin móvil
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(`/api/orders/new-count?since=${encodeURIComponent(sinceRef.current)}`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data: { count: number; latest: NewOrder[] } = await res.json();

        const trulyNew = data.latest.filter(o => !seenIdsRef.current.has(o.id));
        if (trulyNew.length > 0) {
          trulyNew.forEach(o => seenIdsRef.current.add(o.id));
          setPendingOrders(prev => [...trulyNew, ...prev].slice(0, 30));
          setShowToast(true);
          playAlert(trulyNew.length);
          showNativeNotification(trulyNew);
        }
      } catch (err) {
        // PRD-221: el polling de pedidos no puede fallar en silencio absoluto
        console.error('[NewOrdersWatcher] error consultando pedidos nuevos:', err);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    // PRD-230: al volver a la pestaña se consulta de inmediato (compensa los polls saltados)
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasPermission]);

  const acknowledge = () => {
    setShowToast(false);
    setPendingOrders([]);
    sinceRef.current = new Date().toISOString();
    if (sinceKey) localStorage.setItem(sinceKey, sinceRef.current);
  };

  // Cierre suave (auto-cierre): oculta el aviso sin marcar el lote como "visto".
  const dismissToast = () => {
    setShowToast(false);
    setPendingOrders([]);
  };

  // Auto-cierre a los 8 s. El conteo solo corre mientras la pestaña está visible
  // y se reinicia cuando llega un pedido nuevo.
  useEffect(() => {
    if (!showToast) return;
    let remaining = 8000;
    let startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const start = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      startedAt = Date.now();
      timer = setTimeout(() => dismissToast(), remaining);
    };
    const pause = () => {
      if (timer) { clearTimeout(timer); timer = null; remaining -= Date.now() - startedAt; }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') start(); else pause();
    };
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast, pendingOrders]);

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
          <ul className="divide-y divide-gray-100">
            {pendingOrders.slice(0, 4).map(o => (
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
          <Link
            href="/admin/orders"
            onClick={acknowledge}
            className="block px-3 py-2.5 text-center text-xs font-bold text-navy bg-gray-50 border-t border-gray-100 active:bg-gray-100"
          >
            {pendingOrders.length > 4 ? `+${pendingOrders.length - 4} más · ver todos los pedidos` : 'Ver más pedidos'}
          </Link>
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
