import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MT, fontSans } from '../theme';
import { emailContactAddress } from '../site';

export function MundoTechFooter() {
  const mail = emailContactAddress();
  const mailto = `mailto:${mail}`;

  return (
    <Section
      style={{
        padding: '28px 24px 32px',
        textAlign: 'center',
        borderTop: `1px solid ${MT.border}`,
        backgroundColor: MT.cardBgAlt,
        fontFamily: fontSans,
      }}
    >
      <Text style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.65, color: MT.textMuted }}>
        Tecnología premium en Barquisimeto
      </Text>
      <Text style={{ margin: '0 0 14px' }}>
        <Link
          href={mailto}
          style={{ color: MT.gold, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}
        >
          {mail}
        </Link>
      </Text>
      <Text style={{ margin: 0, fontSize: 12, color: MT.textMuted }}>
        MundoTech · Conectados Contigo
      </Text>
    </Section>
  );
}
