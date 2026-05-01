import { Column, Img, Link, Row, Section, Text } from '@react-email/components';
import * as React from 'react';
import { roundMoney2 } from '@/lib/exchange-rate';
import { DualMoneyInline } from './components/DualMoneyInline';
import { PrimaryCta } from './components/PrimaryCta';
import { MundoTechShell } from './MundoTechShell';
import type { OrderConfirmationPayload } from './types';
import { emailSiteBaseUrl } from './site';
import { MT, fontSans } from './theme';

function formatVariations(v: OrderConfirmationPayload['items'][0]['variations']): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t || null;
  }
  const parts = Object.entries(v)
    .map(([k, val]) => {
      const tv = String(val).trim();
      if (!tv) return null;
      return `${k}: ${tv}`;
    })
    .filter(Boolean) as string[];
  return parts.length ? parts.join(', ') : null;
}

function paddedOrderNo(n: number): string {
  return String(n).padStart(4, '0');
}

const cardTableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  border: `1px solid ${MT.border}`,
  borderRadius: 14,
  backgroundColor: MT.cardBgAlt,
  width: '100%',
};

export function OrderConfirmationEmail(payload: OrderConfirmationPayload) {
  const base = emailSiteBaseUrl().replace(/\/$/, '');
  const orderHref = `${base}/account/orders/${encodeURIComponent(payload.id)}`;
  const padded = paddedOrderNo(payload.orderNumber);

  const formattedDate = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(payload.createdAt);

  const rate = payload.exchangeRateUsdBs;
  const rateNote =
    rate != null && rate > 0
      ? `Tasa de este pedido (fija): Bs.S ${rate.toFixed(2)} por USD.`
      : 'Equivalente en bolívares no mostrado (pedido sin tasa registrada).';

  const shipMethod = payload.shippingMethod?.trim() || 'Por coordinar';
  const lineCount = payload.items.length;
  const resumenLabel =
    lineCount === 1 ? 'Resumen del pedido (1 artículo)' : `Resumen del pedido (${lineCount} artículos)`;

  return (
    <MundoTechShell
      preview={`Pedido #${padded} confirmado — gracias por tu compra en MundoTech.`}
      title={`MundoTech · Pedido #${padded}`}
      headerCompact
    >
      {/* ── Hero (mockup): gracias + fecha VET ───────────────────────────── */}
      <Section className="mt-pad" style={{ padding: '24px 24px 20px', fontFamily: fontSans }}>
        <Text
          style={{
            margin: '0 0 10px',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.25,
            color: MT.textPrimary,
          }}
        >
          ¡Gracias por tu compra, {payload.customerName}!
        </Text>
        <Text style={{ margin: '0 0 6px', fontSize: 14, color: MT.textMuted }}>
          Realizado el {formattedDate} VET
        </Text>
        <Text style={{ margin: 0, fontSize: 13, color: MT.textMuted }}>
          Pedido <span style={{ color: MT.textPrimary, fontWeight: 600 }}>#{padded}</span>
          {' · '}
          Estado:{' '}
          <span style={{ color: MT.textPrimary, fontWeight: 600 }}>{payload.status}</span>
        </Text>
      </Section>

      {/* ── Una tarjeta por producto ───────────────────────────────────── */}
      <Section style={{ padding: '6px 24px 8px', fontFamily: fontSans }}>
        {payload.items.map((item, idx) => {
          const productUrl = `${base}/product/${encodeURIComponent(item.slug)}`;
          const lineUsd = roundMoney2(item.priceUsd * item.quantity);
          const vars = formatVariations(item.variations);
          const imgSrc = item.image;

          return (
            <Section key={`${item.slug}-${idx}`} style={{ marginBottom: idx < payload.items.length - 1 ? 14 : 0 }}>
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={cardTableStyle}>
                <tbody>
                  <tr>
                    <td style={{ padding: 18 }}>
                      <Row>
                        <Column style={{ width: 88, verticalAlign: 'top' }}>
                          {imgSrc ? (
                            <Img
                              alt={item.name}
                              src={imgSrc}
                              width={72}
                              height={72}
                              style={{
                                display: 'block',
                                borderRadius: 12,
                                width: 72,
                                height: 72,
                                border: `1px solid ${MT.border}`,
                                backgroundColor: MT.cardBg,
                                padding: 4,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: 12,
                                backgroundColor: MT.cardBg,
                                border: `1px solid ${MT.border}`,
                              }}
                            />
                          )}
                        </Column>
                        <Column style={{ verticalAlign: 'top', paddingLeft: 4 }}>
                          <Link
                            href={productUrl}
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: MT.gold,
                              textDecoration: 'none',
                              lineHeight: 1.35,
                            }}
                          >
                            {item.name}
                          </Link>
                          <Text style={{ margin: '10px 0 4px', fontSize: 14, color: MT.textPrimary }}>
                            Cantidad:{' '}
                            <span style={{ fontWeight: 700 }}>{item.quantity}</span>
                          </Text>
                          {vars ? (
                            <Text style={{ margin: '0 0 12px', fontSize: 13, color: MT.textMuted }}>
                              Variaciones: <span style={{ color: MT.textPrimary }}>{vars}</span>
                            </Text>
                          ) : null}
                          <Text style={{ margin: '0 0 4px', fontSize: 13, color: MT.textMuted }}>
                            Subtotal del artículo
                          </Text>
                          <DualMoneyInline amountUsd={lineUsd} exchangeRateUsdBs={rate} fontSize={14} bold />
                        </Column>
                      </Row>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          );
        })}
      </Section>

      {/* ── Resumen del pedido (mockup) ─────────────────────────────────── */}
      <Section style={{ padding: '14px 24px 12px', fontFamily: fontSans }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={cardTableStyle}>
          <tbody>
            <tr>
              <td colSpan={2} style={{ padding: '18px 18px 12px' }}>
                <Text style={{ margin: 0, fontSize: 16, fontWeight: 700, color: MT.textPrimary }}>
                  {resumenLabel}
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px 18px', verticalAlign: 'top' }}>
                <Text style={{ margin: 0, fontSize: 14, color: MT.textMuted }}>Subtotal del artículo</Text>
              </td>
              <td style={{ padding: '10px 18px', textAlign: 'right', verticalAlign: 'top' }} align="right">
                <DualMoneyInline amountUsd={payload.subtotalUsd} exchangeRateUsdBs={rate} />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px 18px', verticalAlign: 'top' }}>
                <Text style={{ margin: 0, fontSize: 14, color: MT.textMuted }}>Tarifa de envío</Text>
              </td>
              <td style={{ padding: '10px 18px', textAlign: 'right', verticalAlign: 'top' }} align="right">
                <DualMoneyInline amountUsd={payload.shippingUsd} exchangeRateUsdBs={rate} />
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ padding: '0 18px' }}>
                <div style={{ borderTop: `1px solid ${MT.border}`, margin: '8px 0 12px' }} />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0 18px 18px', verticalAlign: 'middle' }}>
                <Text style={{ margin: 0, fontSize: 16, fontWeight: 700, color: MT.textPrimary }}>Total</Text>
              </td>
              <td style={{ padding: '0 18px 18px', textAlign: 'right', verticalAlign: 'middle' }} align="right">
                <DualMoneyInline amountUsd={payload.totalUsd} exchangeRateUsdBs={rate} bold fontSize={17} />
              </td>
            </tr>
          </tbody>
        </table>
        <Text style={{ margin: '10px 8px 0', fontSize: 11, lineHeight: 1.5, color: MT.textMuted }}>
          {rateNote}
        </Text>
      </Section>

      {/* ── Entrega y pago (compacto) ─────────────────────────────────── */}
      <Section style={{ padding: '8px 24px 16px', fontFamily: fontSans }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={cardTableStyle}>
          <tbody>
            <tr>
              <td style={{ padding: '16px 18px' }}>
                <Text
                  style={{
                    margin: '0 0 10px',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: MT.textMuted,
                  }}
                >
                  Entrega
                </Text>
                <Text style={{ margin: '0 0 6px', fontSize: 13, color: MT.textMuted }}>
                  Método:{' '}
                  <span style={{ color: MT.textPrimary, fontWeight: 600 }}>{shipMethod}</span>
                </Text>
                <Text style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.55, color: MT.textPrimary }}>
                  {payload.shippingAddress}
                </Text>
                <Text style={{ margin: '0 0 8px', fontSize: 13, color: MT.textMuted }}>
                  {payload.shippingCity}, {payload.shippingState} · C.P. {payload.shippingZipCode} ·{' '}
                  {payload.shippingCountry}
                </Text>
                {payload.customerPhone?.trim() ? (
                  <Text style={{ margin: 0, fontSize: 13, color: MT.textMuted }}>
                    Tel:{' '}
                    <span style={{ color: MT.textPrimary, fontWeight: 600 }}>{payload.customerPhone.trim()}</span>
                  </Text>
                ) : null}

                <div style={{ borderTop: `1px solid ${MT.border}`, margin: '16px 0 14px' }} />

                <Text
                  style={{
                    margin: '0 0 10px',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: MT.textMuted,
                  }}
                >
                  Pago
                </Text>
                <Text style={{ margin: '0 0 6px', fontSize: 14, color: MT.textPrimary }}>
                  <strong>{payload.paymentMethod}</strong>
                </Text>
                {payload.paymentBank?.trim() ? (
                  <Text style={{ margin: '4px 0 0', fontSize: 13, color: MT.textMuted }}>
                    Banco:{' '}
                    <span style={{ color: MT.textPrimary, fontWeight: 600 }}>{payload.paymentBank.trim()}</span>
                  </Text>
                ) : null}
                {payload.paymentReference?.trim() ? (
                  <Text style={{ margin: '4px 0 0', fontSize: 13, color: MT.textMuted }}>
                    Referencia:{' '}
                    <span style={{ color: MT.textPrimary, fontWeight: 600 }}>
                      {payload.paymentReference.trim()}
                    </span>
                  </Text>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ padding: '4px 28px 8px', fontFamily: fontSans, textAlign: 'center' }}>
        <Text style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: MT.textMuted }}>
          Recibirás un correo cuando tu pedido sea enviado (con número de rastreo cuando aplique).
        </Text>
      </Section>

      <PrimaryCta href={orderHref} label="Ver detalles del pedido" fullWidth />
      <Section style={{ padding: '0 24px 28px', fontFamily: fontSans }} />
    </MundoTechShell>
  );
}
