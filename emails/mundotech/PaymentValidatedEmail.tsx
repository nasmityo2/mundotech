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
  orderUuid?: string;
};

export function PaymentValidatedEmail({ customerName, orderDisplayId, orderUuid }: Props) {
  const base = emailSiteBaseUrl().replace(/\/$/, '');
  const ordersPath = orderUuid
    ? `${base}/account/orders/${encodeURIComponent(orderUuid)}`
    : `${base}/account/orders`;

  return (
    <MundoTechShell
      preview="Pago confirmado — estamos preparando tu pedido."
      title="Pago confirmado — MundoTech"
      heroCustomerName={customerName}
    >
      <Section style={{ padding: '12px 24px 8px', fontFamily: fontSans }}>
        <StatusPill tone="success">Pago confirmado</StatusPill>
        <Text style={{ margin: '0 0 8px', fontSize: 16, lineHeight: 1.6, color: MT.textPrimary }}>
          Hola <strong>{customerName}</strong>,
        </Text>
        <Text style={{ margin: '0 0 14px', fontSize: 18, lineHeight: 1.45, color: MT.success, fontWeight: 700 }}>
          Tu pago fue verificado correctamente
        </Text>
        <Text style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: MT.textMuted }}>
          Hemos confirmado el pago del pedido{' '}
          <strong style={{ color: MT.textPrimary }}>#{orderDisplayId}</strong>. Ya estamos preparando tu envío con el
          mayor cuidado.
        </Text>
      </Section>

      <PrimaryCta href={ordersPath} label="Ver detalles del pedido" />
      <Section style={{ padding: '0 24px 28px', fontFamily: fontSans }} />
    </MundoTechShell>
  );
}
