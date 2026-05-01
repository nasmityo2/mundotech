import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { PrimaryCta } from './components/PrimaryCta';
import { StatusPill } from './components/StatusPill';
import { MundoTechShell } from './MundoTechShell';
import { emailSiteBaseUrl } from './site';
import { MT, fontSans } from './theme';

type Props = {
  customerName: string;
  orderUuid: string;
};

export function OrderDeliveredEmail({ customerName, orderUuid }: Props) {
  const base = emailSiteBaseUrl().replace(/\/$/, '');
  const orderUrl = `${base}/account/orders/${encodeURIComponent(orderUuid)}`;
  const shopUrl = `${base}/productos`;

  return (
    <MundoTechShell
      preview="Tu pedido fue entregado — gracias por confiar en MundoTech."
      title="Pedido entregado — MundoTech"
      heroCustomerName={customerName}
    >
      <Section style={{ padding: '12px 24px 8px', fontFamily: fontSans }}>
        <StatusPill tone="success">Entregado</StatusPill>
        <Text style={{ margin: '0 0 8px', fontSize: 16, lineHeight: 1.6, color: MT.textPrimary }}>
          Hola <strong>{customerName}</strong>,
        </Text>
        <Text style={{ margin: '0 0 14px', fontSize: 18, lineHeight: 1.45, color: MT.textPrimary, fontWeight: 700 }}>
          Tu pedido fue entregado
        </Text>
        <Text style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: MT.textMuted }}>
          Esperamos que disfrutes tu compra. Si necesitas ayuda con garantía o accesorios, escríbenos.
        </Text>
      </Section>

      <PrimaryCta href={orderUrl} label="Ver detalles del pedido" />

      <Section style={{ textAlign: 'center', padding: '12px 24px 28px', fontFamily: fontSans }}>
        <Link
          href={shopUrl}
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            color: MT.gold,
            backgroundColor: 'rgba(255, 215, 0, 0.08)',
            borderRadius: 12,
            textDecoration: 'none',
            border: `1px solid ${MT.gold}`,
          }}
        >
          Comprar nuevamente
        </Link>
      </Section>
    </MundoTechShell>
  );
}
