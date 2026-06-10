import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { PrimaryCta } from './components/PrimaryCta';
import { StatusPill } from './components/StatusPill';
import { MundoTechShell } from './MundoTechShell';
import { emailSiteBaseUrl } from './site';
import { MT, fontSans } from './theme';

type Props = {
  customerName: string;
  orderDisplayId: string;
  reason: string;
  orderUuid?: string;
};

export function PaymentRejectedEmail({ customerName, orderDisplayId, reason, orderUuid }: Props) {
  const base = emailSiteBaseUrl().replace(/\/$/, '');
  const orderSegment = orderDisplayId.trim() || orderUuid?.trim() || '';
  const ordersPath = orderSegment
    ? `${base}/account/orders/${encodeURIComponent(orderSegment)}`
    : `${base}/account/orders`;

  return (
    <MundoTechShell
      preview="No pudimos verificar el pago de tu pedido."
      title="Pago no verificado — MundoTech"
      heroCustomerName={customerName}
    >
      <Section style={{ padding: '12px 24px 8px', fontFamily: fontSans }}>
        <StatusPill tone="neutral">Pago no verificado</StatusPill>
        <Text style={{ margin: '0 0 8px', fontSize: 16, lineHeight: 1.6, color: MT.textPrimary }}>
          Hola <strong>{customerName}</strong>,
        </Text>
        <Text style={{ margin: '0 0 14px', fontSize: 18, lineHeight: 1.45, color: MT.danger, fontWeight: 700 }}>
          No pudimos verificar el pago de tu pedido
        </Text>
        <Text style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.7, color: MT.textMuted }}>
          No logramos confirmar el pago del pedido{' '}
          <strong style={{ color: MT.textPrimary }}>#{orderDisplayId}</strong>, por lo que ha sido cancelado y las
          unidades regresaron al inventario.
        </Text>
        {reason?.trim() ? (
          <Text
            style={{
              margin: '0 0 12px',
              fontSize: 14,
              lineHeight: 1.6,
              color: MT.textPrimary,
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <strong>Motivo:</strong> {reason.trim()}
          </Text>
        ) : null}
        <Text style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: MT.textMuted }}>
          Si ya pagaste o crees que es un error, tranquilo: responde a este
          correo con tu comprobante o escríbenos por WhatsApp al 0412-1471338 y
          lo revisamos de una vez. También puedes repetir el pedido cuando
          quieras — el stock vuelve a estar disponible.
        </Text>
      </Section>

      <PrimaryCta href={ordersPath} label="Ver mis pedidos" />
      <Section style={{ padding: '0 24px 28px', fontFamily: fontSans }} />
    </MundoTechShell>
  );
}
