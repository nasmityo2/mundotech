import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { MT, fontSans } from '../theme';

type Props = {
  customerName?: string;
  /** Sin nombre destacado bajo el eslogan (el saludo va en el cuerpo del correo). */
  compact?: boolean;
};

/**
 * Cabecera-letrero: la única zona oscura del correo. Reproduce el letrero
 * físico de la tienda (fondo negro/navy + logo amarillo + slogan). El cuerpo
 * del correo es claro por decisión del dueño.
 */
export function MundoTechHeader({ customerName, compact }: Props) {
  const name = !compact ? customerName?.trim() : undefined;

  return (
    <Section
      style={{
        textAlign: 'center',
        padding: compact ? '26px 24px 22px' : '30px 28px 26px',
        backgroundColor: MT.bandBg,
        borderBottom: `3px solid ${MT.gold}`,
        fontFamily: fontSans,
      }}
    >
      <Text
        style={{
          margin: '0 0 6px',
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#FFFFFF',
          lineHeight: 1.2,
        }}
      >
        Mundo <span style={{ color: MT.gold }}>Tech</span>
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 12,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: MT.gold,
          fontWeight: 700,
        }}
      >
        Conectados Contigo
      </Text>
      {name ? (
        <Text
          style={{
            margin: '14px 0 0',
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.85)',
          }}
        >
          {name}
        </Text>
      ) : null}
    </Section>
  );
}
