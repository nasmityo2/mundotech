import { Button, Section } from '@react-email/components';
import * as React from 'react';
import { MT, fontSans } from '../theme';

type Props = {
  href: string;
  label: string;
};

/** CTA único marca — mismo estilo en todos los correos transaccionales. */
export function PrimaryCta({ href, label }: Props) {
  return (
    <Section style={{ textAlign: 'center', padding: '16px 24px 8px', fontFamily: fontSans }}>
      <Button
        href={href}
        style={{
          backgroundColor: MT.gold,
          color: MT.navy,
          borderRadius: 12,
          fontWeight: 600,
          padding: '14px 28px',
          fontSize: 15,
          textDecoration: 'none',
          display: 'inline-block',
          border: `1px solid #e6c200`,
          fontFamily: fontSans,
        }}
      >
        {label}
      </Button>
    </Section>
  );
}
