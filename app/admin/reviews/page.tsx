'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Star, Check, X, Trash2, AlertCircle, ShieldCheck, MessageSquare, Loader2, Eye,
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { TouchIconButton } from '@/components/admin/TouchIconButton';
import { Stars } from '@/components/reviews/Stars';
import type { Review, ReviewStatus } from '@/lib/definitions';

type Tab = ReviewStatus | 'all';

const TABS: { id: Tab; label: string }[] = [
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'APPROVED', label: 'Aprobadas' },
  { id: 'REJECTED', label: 'Rechazadas' },
  { id: 'all', label: 'Todas' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [autoApprove, setAutoApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [replyFor, setReplyFor] = useState<Review | null>(null);
  const [detailFor, setDetailFor] = useState<Review | null>(null);

  const flash = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?status=${tab}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
        setCounts(data.counts ?? { PENDING: 0, APPROVED: 0, REJECTED: 0 });
        setAutoApprove(!!data.autoApprove);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const moderate = async (r: Review, status: ReviewStatus) => {
    const res = await fetch(`/api/reviews/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      flash('success', status === 'APPROVED' ? 'Reseña aprobada.' : 'Reseña rechazada.');
      fetchReviews();
    } else flash('error', 'No se pudo actualizar.');
  };

  const remove = async (r: Review) => {
    if (!confirm('¿Eliminar esta reseña de forma permanente?')) return;
    const res = await fetch(`/api/reviews/${r.id}`, { method: 'DELETE' });
    if (res.ok) { flash('success', 'Reseña eliminada.'); fetchReviews(); }
    else flash('error', 'No se pudo eliminar.');
  };

  const toggleAutoApprove = async () => {
    const next = !autoApprove;
    // PRD-247: activar publica reseñas nuevas sin moderación previa — exige
    // confirmación explícita (el cambio queda auditado en servidor, PRD-229).
    if (next) {
      const ok = window.confirm(
        'Con auto-aprobación activa, toda reseña nueva se publica de inmediato en la tienda sin pasar por moderación (incluidas las de usuarios sin compra verificada).\n\n¿Activar auto-aprobación?',
      );
      if (!ok) return;
    }
    const res = await fetch('/api/reviews/auto-approve', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoApprove: next }),
    });
    if (res.ok) { setAutoApprove(next); flash('success', next ? 'Auto-aprobación activada.' : 'Auto-aprobación desactivada.'); }
    else flash('error', 'No se pudo actualizar la configuración.');
  };

  const columns: DataTableColumn<Review>[] = [
    {
      key: 'product', header: 'Producto', primary: true,
      cell: r => <span className="block truncate font-medium text-navy">{r.productName ?? '—'}</span>,
    },
    {
      key: 'rating', header: 'Valoración', mobileLabel: 'Valoración',
      cell: r => (
        <span className="inline-flex items-center gap-1.5">
          <Stars rating={r.rating} size={12} />
          {r.verifiedPurchase && <ShieldCheck size={13} className="text-emerald-500" />}
        </span>
      ),
    },
    {
      key: 'comment', header: 'Comentario', secondary: true, mobileLabel: 'Comentario',
      cell: r => (
        <button
          type="button"
          onClick={() => setDetailFor(r)}
          className="block max-w-[28ch] truncate text-left text-gray-600 text-[13px] hover:text-navy hover:underline"
        >
          {r.title ? <strong className="text-navy">{r.title}: </strong> : null}{r.comment}
        </button>
      ),
    },
    {
      key: 'author', header: 'Autor', mobileLabel: 'Autor',
      cell: r => <span className="text-[12px] text-gray-500">{r.authorName}</span>,
    },
    {
      key: 'createdAt', header: 'Fecha', mobileLabel: 'Fecha', align: 'right',
      cell: r => <span className="text-[12px] text-gray-400">{formatDate(r.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-amber-50 text-navy flex items-center justify-center">
            <Star size={22} />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-navy">Reseñas</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {counts.PENDING} pendientes · {counts.APPROVED} aprobadas
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleAutoApprove}
          className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-bold border transition ${
            autoApprove
              ? 'bg-green-50 border-green-300 text-green-800'
              : 'bg-white border-gray-200 text-gray-600 active:bg-gray-100'
          }`}
        >
          <Check size={15} className={autoApprove ? '' : 'opacity-40'} />
          Auto-aprobar {autoApprove ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-[40px] px-3.5 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              tab === t.id ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            {t.label}
            {t.id !== 'all' && counts[t.id] > 0 && (
              <span className={`ml-1.5 text-[11px] ${tab === t.id ? 'text-white/70' : 'text-gray-400'}`}>
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? <Check size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <DataTable<Review>
        data={reviews}
        columns={columns}
        rowKey={r => r.id}
        loading={loading}
        emptyState="No hay reseñas en esta categoría."
        actions={r => (
          <>
            <TouchIconButton
              variant="default"
              label="Ver"
              icon={<Eye size={18} />}
              onClick={() => setDetailFor(r)}
            />
            {r.status !== 'APPROVED' && (
              <TouchIconButton
                variant="primary"
                label="Aprobar"
                icon={<Check size={18} />}
                onClick={() => moderate(r, 'APPROVED')}
              />
            )}
            {r.status !== 'REJECTED' && (
              <TouchIconButton
                variant="default"
                label="Rechazar"
                icon={<X size={18} />}
                onClick={() => moderate(r, 'REJECTED')}
              />
            )}
            <TouchIconButton
              variant="default"
              label="Responder"
              icon={<MessageSquare size={18} />}
              onClick={() => setReplyFor(r)}
            />
            <TouchIconButton
              variant="danger"
              label="Eliminar"
              icon={<Trash2 size={18} />}
              onClick={() => remove(r)}
            />
          </>
        )}
      />

      {replyFor && (
        <ReplyDialog
          review={replyFor}
          onClose={() => setReplyFor(null)}
          onSaved={() => { setReplyFor(null); flash('success', 'Respuesta guardada.'); fetchReviews(); }}
          onError={() => flash('error', 'No se pudo guardar la respuesta.')}
        />
      )}

      {detailFor && (
        <ReviewDetailDialog
          review={detailFor}
          onClose={() => setDetailFor(null)}
          onApprove={() => { moderate(detailFor, 'APPROVED'); setDetailFor(null); }}
          onReject={() => { moderate(detailFor, 'REJECTED'); setDetailFor(null); }}
        />
      )}
    </div>
  );
}

function ReviewDetailDialog({
  review, onClose, onApprove, onReject,
}: {
  review: Review;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:w-[520px] sm:max-w-[92vw] bg-white sm:rounded-2xl shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[88vh]">
        <header className="border-b border-gray-100 px-4 py-3.5 flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-navy truncate">Reseña completa</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <p className="text-xs text-gray-500">{review.productName ?? '—'} · {formatDate(review.createdAt)}</p>
          <div className="flex items-center gap-2">
            <Stars rating={review.rating} size={14} />
            {review.authorName}
            {review.verifiedPurchase && <ShieldCheck size={14} className="text-emerald-500" />}
          </div>
          {review.title && <p className="text-sm font-bold text-navy">{review.title}</p>}
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{review.comment}</p>
          {review.photos && review.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {review.photos.map((src) => (
                <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Foto de la reseña" className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                </a>
              ))}
            </div>
          )}
          {review.adminReply && (
            <div className="mt-2 pl-3 border-l-2 border-amber-200">
              <p className="text-[11px] font-semibold text-amber-700">Tu respuesta</p>
              <p className="text-sm text-gray-600">{review.adminReply}</p>
            </div>
          )}
        </div>
        <footer className="border-t border-gray-100 px-4 py-3 flex gap-2">
          {review.status !== 'APPROVED' && (
            <button onClick={onApprove} className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 bg-green-50 border border-green-300 text-green-800 text-sm font-bold rounded-xl active:bg-green-100">
              <Check size={16} /> Aprobar
            </button>
          )}
          {review.status !== 'REJECTED' && (
            <button onClick={onReject} className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl active:bg-gray-100">
              <X size={16} /> Rechazar
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function ReplyDialog({
  review, onClose, onSaved, onError,
}: {
  review: Review;
  onClose: () => void;
  onSaved: () => void;
  onError: () => void;
}) {
  const [reply, setReply] = useState(review.adminReply ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminReply: reply.trim() || null }),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else onError();
  };

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:w-[460px] sm:max-w-[92vw] bg-white sm:rounded-2xl shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[88vh]">
        <header className="border-b border-gray-100 px-4 py-3.5 flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-navy truncate">Responder reseña</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Stars rating={review.rating} size={13} />
              <span className="text-xs font-semibold text-navy">{review.authorName}</span>
            </div>
            {review.title && <p className="text-sm font-semibold text-navy">{review.title}</p>}
            <p className="text-sm text-gray-600 mt-0.5">{review.comment}</p>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1.5">Tu respuesta pública</label>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Gracias por tu comentario…"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-gray-50 text-base focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-y"
            />
          </div>
        </div>
        <footer className="border-t border-gray-100 px-4 py-3 flex gap-2">
          <button onClick={onClose} disabled={saving} className="flex-1 min-h-[52px] bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl active:bg-gray-100">
            Cancelar
          </button>
          <button onClick={save} disabled={saving} className="flex-[2] min-h-[52px] inline-flex items-center justify-center gap-2 bg-brand-yellow border border-yellow-400 text-navy text-sm font-black uppercase rounded-xl active:bg-yellow-300 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Guardar respuesta
          </button>
        </footer>
      </div>
    </div>
  );
}
