'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Star, Loader2, CheckCircle2, ShieldCheck, MessageSquarePlus, X } from 'lucide-react';
import { Stars } from '@/components/reviews/Stars';
import type { Review, ReviewSummary } from '@/lib/definitions';

interface Props {
  productId: string;
  productName: string;
  initialSummary: ReviewSummary;
  initialReviews: Review[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ProductReviews({ productId, productName, initialSummary, initialReviews }: Props) {
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<ReviewSummary>(initialSummary);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const isAuthed = status === 'authenticated' && !!session?.user;

  const refresh = async () => {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const data = (await res.json()) as { summary: ReviewSummary; reviews: Review[] };
        setSummary(data.summary);
        setReviews(data.reviews);
      }
    } catch { /* no-op */ }
  };

  const submit = async () => {
    setError(null);
    if (rating < 1) { setError('Selecciona una valoración (1 a 5 estrellas).'); return; }
    if (comment.trim().length < 5) { setError('Escribe un comentario (mínimo 5 caracteres).'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title: title.trim() || null, comment: comment.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string; moderated?: boolean };
      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar la reseña.');
        return;
      }
      setDoneMsg(data.message ?? '¡Gracias por tu reseña!');
      setShowForm(false);
      setRating(0); setTitle(''); setComment('');
      if (!data.moderated) await refresh();
    } catch {
      setError('Hubo un problema. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const total = summary.count;
  const maxBar = Math.max(1, ...summary.breakdown);

  return (
    <section id="reviews" className="mt-12 scroll-mt-24">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h2 className="text-[1.3rem] sm:text-2xl md:text-[1.75rem] font-bold text-navy tracking-tight">
          Opiniones de clientes
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setDoneMsg(null); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy text-white text-sm font-semibold px-4 py-2.5 hover:bg-navy-700 active:scale-[0.98] transition-all"
          >
            <MessageSquarePlus size={16} /> Escribir reseña
          </button>
        )}
      </div>

      {doneMsg && (
        <div className="mb-6 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{doneMsg}</span>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-10 items-center rounded-2xl border border-slate-200 p-5 sm:p-6 mb-8">
        <div className="text-center sm:border-r sm:border-slate-100 sm:pr-10">
          <div className="text-5xl font-black text-navy leading-none nums">
            {total > 0 ? summary.average.toFixed(1) : '—'}
          </div>
          <div className="mt-2 flex justify-center">
            <Stars rating={summary.average} size={16} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {total > 0 ? `${total} ${total === 1 ? 'reseña' : 'reseñas'}` : 'Sin reseñas aún'}
          </p>
        </div>

        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = summary.breakdown[star - 1];
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-slate-500 nums">{star}</span>
                <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${total > 0 ? (n / maxBar) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-right text-slate-400 nums">{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="rounded-2xl border border-slate-200 p-5 sm:p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-navy">Tu reseña de {productName}</h3>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" className="text-slate-400 hover:text-navy">
              <X size={18} />
            </button>
          </div>

          {!isAuthed ? (
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-5 text-center">
              <p className="text-sm text-slate-600">
                Inicia sesión para compartir tu opinión sobre este producto.
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-navy text-white text-sm font-semibold px-5 py-2.5 hover:bg-navy-700 transition-colors"
              >
                Iniciar sesión
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tu valoración</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHover(s)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${s} estrellas`}
                      className="p-0.5"
                    >
                      <Star
                        size={28}
                        className={
                          (hover || rating) >= s
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título (opcional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Resume tu experiencia"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-navy focus:ring-2 focus:ring-navy/10 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tu comentario</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="¿Qué te pareció el producto? ¿Lo recomiendas?"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-navy focus:ring-2 focus:ring-navy/10 outline-none resize-y"
                />
              </div>

              {error && <p className="text-xs text-rose-600">{error}</p>}

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy text-white text-sm font-semibold px-6 py-2.5 hover:bg-navy-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : 'Publicar reseña'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de reseñas */}
      {reviews.length > 0 ? (
        <ul className="space-y-5">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-slate-100 pb-5 last:border-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy text-sm">{r.authorName}</span>
                  {r.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <ShieldCheck size={12} /> Compra verificada
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">{formatDate(r.createdAt)}</span>
              </div>
              <div className="mt-1.5">
                <Stars rating={r.rating} size={13} />
              </div>
              {r.title && <p className="mt-2 text-sm font-semibold text-navy">{r.title}</p>}
              <p className="mt-1 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{r.comment}</p>
              {r.adminReply && (
                <div className="mt-3 ml-3 pl-3 border-l-2 border-amber-200">
                  <p className="text-[11px] font-semibold text-amber-700">Respuesta de MundoTech</p>
                  <p className="text-sm text-slate-600 mt-0.5">{r.adminReply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 text-center py-8">
          Aún no hay reseñas. ¡Sé el primero en opinar sobre {productName}!
        </p>
      )}
    </section>
  );
}
