import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { PrimaryCta } from './components/PrimaryCta';
import { StatusPill } from './components/StatusPill';
import { MundoTechShell } from './MundoTechShell';
import { emailSiteBaseUrl, emailStorePhones } from './site';
import { MT, fontSans } from './theme';

type Props = {
  customerName: string;
  /** Número de pedido formateado (ej. "0042"). */
  orderDisplayId: string;
};

export function OrderCancelledEmail({ customerName, orderDisplayId }: Props) {
  const base = emailSiteBaseUrl().replace(/\/$/, '');
  const ordersPath = `${base}/account/orders`;

  return (
    <MundoTechShell
      preview="Tu pedido fue cancelado — el stock ya está disponible de nuevo."
      title="Pedido cancelado — MundoTech"
      heroCustomerName={customerName}
    >
      <Section style={{ padding: '12px 24px 8px', fontFamily: fontSans }}>
        <StatusPill tone="neutral">Cancelado</StatusPill>
        <Text style={{ margin: '0 0 8px', fontSize: 16, lineHeight: 1.6, color: MT.textPrimary }}>
          Hola <strong>{customerName}</strong>,
        </Text>
        <Text
          style={{
            margin: '0 0 14px',
            fontSize: 18,
            lineHeight: 1.45,
            color: MT.danger,
            fontWeight: 700,
          }}
        >
          Tu pedido #{orderDisplayId} fue cancelado
        </Text>
        <Text style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.7, color: MT.textMuted }}>
          Las unidades han regresado al inventario y, si usaste un cupón, su uso
          también ha sido revertido.
        </Text>
        <Text style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: MT.textMuted }}>
          ¿Tienes preguntas o crees que es un error? Responde a este correo o
          escríbenos por WhatsApp al {emailStorePhones()} y lo revisamos. Puedes
          realizar un pedido nuevo cuando quieras.
        </Text>
      </Section>

      <PrimaryCta href={ordersPath} label="Ver mis pedidos" />

      <Section style={{ padding: '0 24px 28px', fontFamily: fontSans }} />
    </MundoTechShell>
  );
}
