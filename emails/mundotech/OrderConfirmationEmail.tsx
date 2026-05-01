import { Column, Img, Link, Row, Section, Text } from '@react-email/components';
import * as React from 'react';
import { roundMoney2 } from '@/lib/exchange-rate';
import { DualMoneyBlock } from './components/DualMoneyBlock';
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
  return parts.length ? parts.join(' · ') : null;
}

function paddedOrderNo(n: number): string {
  return String(n).padStart(4, '0');
}

function statusBadgeNeutral(label: string) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: fontSans,
        color: MT.textMuted,
        backgroundColor: 'rgba(148, 163, 184, 0.12)',
        borderRadius: 999,
        border: `1px solid ${MT.border}`,
      }}
    >
      {label}
    </span>
  );
}

export function OrderConfirmationEmail(payload: OrderConfirmationPayload) {
  const base = emailSiteBaseUrl().replace(/\/$/, '');
  const orderHref = `${base}/account/orders/${encodeURIComponent(payload.id)}`;
  const padded = paddedOrderNo(payload.orderNumber);

  const formattedDate = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(payload.createdAt);

  const rate = payload.exchangeRateUsdBs;
  const rateNote =
    rate != null && rate > 0
      ? `Tasa registrada en este pedido (no cambia): Bs.S ${rate.toFixed(2)} por USD. Los montos reflejan lo pagado en ese momento.`
      : 'Montos en USD (pedido sin tasa registrada en el sistema). Equivalente en bolívares no mostrado.';

  const shipMethod = payload.shippingMethod?.trim() || 'Por coordinar';

  return (
    <MundoTechShell
      preview={`Pedido #${padded} confirmado — gracias por tu compra en MundoTech.`}
      title={`MundoTech · Pedido #${padded}`}
      heroCustomerName={payload.customerName}
    >
      <Section className="mt-pad" style={{ padding: '12px 24px 8px', fontFamily: fontSans }}>
        <Text style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: MT.textPrimary }}>
          ¡Hola, {payload.customerName}!
        </Text>
        <Text style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: MT.textMuted }}>
          Gracias por tu compra. Aquí tienes el resumen de tu pedido{' '}
          <span style={{ color: MT.textPrimary, fontWeight: 700 }}>#{padded}</span>.
        </Text>
      </Section>

      <Section style={{ padding: '8px 24px 16px', fontFamily: fontSans }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{
            borderCollapse: 'collapse',
            border: `1px solid ${MT.border}`,
            borderRadius: 12,
            backgroundColor: MT.cardBgAlt,
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '18px 20px' }}>
                <Text
                  style={{
                    margin: '0 0 8px',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: MT.textMuted,
                  }}
                >
                  Resumen
                </Text>
                <Text style={{ margin: '0 0 12px', fontSize: 13, color: MT.textMuted }}>
                  {formattedDate}
                </Text>
                {statusBadgeNeutral(payload.status)}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ padding: '4px 24px 8px', fontFamily: fontSans }}>
        <Text
          style={{
            margin: '0 0 12px',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: MT.textMuted,
          }}
        >
          Productos
        </Text>
      </Section>

      <Section style={{ padding: '0 24px 8px', fontFamily: fontSans }}>
        {payload.items.map((item, idx) => {
          const productUrl = `${base}/product/${encodeURIComponent(item.slug)}`;
          const lineUsd = roundMoney2(item.priceUsd * item.quantity);
          const vars = formatVariations(item.variations);
          const imgSrc = item.image;

          return (
            <Section
              key={`${item.slug}-${idx}`}
              style={{
                borderBottom: `1px solid ${MT.border}`,
                paddingTop: 14,
                paddingBottom: 14,
              }}
            >
              <Row>
                <Column style={{ width: 72, verticalAlign: 'top' }}>
                  {imgSrc ? (
                    <Img
                      alt={item.name}
                      src={imgSrc}
                      width={56}
                      height={56}
                      style={{
                        display: 'block',
                        borderRadius: 12,
                        width: 56,
                        height: 56,
                        border: `1px solid ${MT.border}`,
                        backgroundColor: MT.cardBgAlt,
                        padding: 4,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: MT.cardBgAlt,
                        border: `1px solid ${MT.border}`,
                      }}
                    />
                  )}
                </Column>
                <Column style={{ verticalAlign: 'top', paddingLeft: 10 }}>
                  <Link
                    href={productUrl}
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: MT.textPrimary,
                      textDecoration: 'underline',
                      textDecorationColor: MT.gold,
                    }}
                  >
                    {item.name}
                  </Link>
                  <Text style={{ margin: '6px 0 4px', fontSize: 13, color: MT.textMuted }}>
                    Cantidad:{' '}
                    <span style={{ color: MT.textPrimary, fontWeight: 600 }}>{item.quantity}</span>
                  </Text>
                  {vars ? (
                    <Text style={{ margin: '0 0 8px', fontSize: 12, color: MT.textMuted }}>
                      {vars}
                    </Text>
                  ) : null}
                  <Text style={{ margin: '4px 0 2px', fontSize: 12, color: MT.textMuted }}>
                    Precio unitario
                  </Text>
                  <DualMoneyBlock amountUsd={item.priceUsd} exchangeRateUsdBs={rate} />
                  <Text style={{ margin: '10px 0 2px', fontSize: 12, color: MT.textMuted }}>
                    Subtotal línea
                  </Text>
                  <DualMoneyBlock amountUsd={lineUsd} exchangeRateUsdBs={rate} />
                </Column>
              </Row>
            </Section>
          );
        })}
      </Section>

      <Section style={{ padding: '12px 24px 8px', fontFamily: fontSans }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{
            borderCollapse: 'collapse',
            border: `1px solid ${MT.border}`,
            borderRadius: 12,
            backgroundColor: MT.cardBgAlt,
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '16px 18px', borderBottom: `1px solid ${MT.border}` }}>
                <Text style={{ margin: 0, fontSize: 13, color: MT.textMuted }}>
                  Subtotal
                </Text>
              </td>
              <td
                style={{
                  padding: '16px 18px',
                  borderBottom: `1px solid ${MT.border}`,
                  textAlign: 'right',
                }}
                align="right"
              >
                <DualMoneyBlock amountUsd={payload.subtotalUsd} exchangeRateUsdBs={rate} />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '16px 18px', borderBottom: `1px solid ${MT.border}` }}>
                <Text style={{ margin: 0, fontSize: 13, color: MT.textMuted }}>
                  Envío
                </Text>
              </td>
              <td
                style={{
                  padding: '16px 18px',
                  borderBottom: `1px solid ${MT.border}`,
                  textAlign: 'right',
                }}
                align="right"
              >
                <DualMoneyBlock amountUsd={payload.shippingUsd} exchangeRateUsdBs={rate} />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                <Text style={{ margin: 0, fontSize: 15, fontWeight: 700, color: MT.textPrimary }}>
                  Total
                </Text>
              </td>
              <td
                style={{ padding: '16px 18px', textAlign: 'right', verticalAlign: 'top' }}
                align="right"
              >
                <DualMoneyBlock
                  amountUsd={payload.totalUsd}
                  exchangeRateUsdBs={rate}
                  emphasize
                />
              </td>
            </tr>
          </tbody>
        </table>
        <Text style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.55, color: MT.textMuted }}>
          {rateNote}
        </Text>
      </Section>

      <Section style={{ padding: '12px 24px 8px', fontFamily: fontSans }}>
        <Text
          style={{
            margin: '0 0 8px',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: MT.textMuted,
          }}
        >
          Envío
        </Text>
        <Text style={{ margin: '0 0 6px', fontSize: 13, color: MT.textMuted }}>
          Método:{' '}
          <span style={{ color: MT.textPrimary, fontWeight: 600 }}>{shipMethod}</span>
        </Text>
        <Text style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: MT.textPrimary }}>
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
      </Section>

      <Section style={{ padding: '8px 24px 16px', fontFamily: fontSans }}>
        <Text
          style={{
            margin: '0 0 8px',
            fontSize: 11,
            letterSpacing: '0.1em',
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
      </Section>

      <PrimaryCta href={orderHref} label="Ver detalles del pedido" />
      <Section style={{ padding: '0 24px 28px', fontFamily: fontSans }} />
    </MundoTechShell>
  );
}
