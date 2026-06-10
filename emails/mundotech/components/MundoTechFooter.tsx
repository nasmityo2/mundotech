import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MT, fontSans } from '../theme';
import {
  emailContactAddress,
  emailStoreAddress,
  emailStorePhones,
  emailInstagramHandle,
} from '../site';

/**
 * Pie de correo con datos verificables de la tienda física. Que el cliente
 * pueda comprobar que existimos es la mejor señal anti-spam y anti-estafa.
 */
export function MundoTechFooter() {
  const mail = emailContactAddress();
  const mailto = `mailto:${mail}`;
  const phones = emailStorePhones();
  const address = emailStoreAddress();
  const instagram = emailInstagramHandle();

  return (
    <Section
      style={{
        padding: '24px 24px 28px',
        textAlign: 'center',
        borderTop: `1px solid ${MT.border}`,
        backgroundColor: MT.cardBgAlt,
        fontFamily: fontSans,
      }}
    >
      <Text style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: MT.textPrimary }}>
        MundoTech — tienda física en Barquisimeto
      </Text>
      <Text style={{ margin: '0 0 4px', fontSize: 12, lineHeight: 1.6, color: MT.textMuted }}>
        {address}
      </Text>
      <Text style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.6, color: MT.textMuted }}>
        {phones} · Instagram {instagram}
      </Text>
      <Text style={{ margin: '0 0 12px' }}>
        <Link
          href={mailto}
          style={{ color: MT.goldText, fontWeight: 700, textDecoration: 'none', fontSize: 13 }}
        >
          {mail}
        </Link>
      </Text>
      <Text style={{ margin: 0, fontSize: 11, color: MT.textMuted }}>
        Conectados Contigo · Si tienes dudas, responde a este correo y te atendemos.
      </Text>
    </Section>
  );
}
