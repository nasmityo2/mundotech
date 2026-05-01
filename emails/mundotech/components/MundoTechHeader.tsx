import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { MT, fontSans } from '../theme';

type Props = {
  customerName?: string;
  /** Sin nombre destacado bajo el eslogan (el saludo va en el cuerpo del correo). */
  compact?: boolean;
};

export function MundoTechHeader({ customerName, compact }: Props) {
  const name = !compact ? customerName?.trim() : undefined;

  return (
    <Section
      style={{
        textAlign: 'center',
        padding: compact ? '28px 24px 22px' : '36px 28px 28px',
        backgroundColor: MT.cardBgAlt,
        borderBottom: `1px solid ${MT.border}`,
        fontFamily: fontSans,
      }}
    >
      {/* Anillo sutil (sin sombras CSS complejas — Outlook-safe) */}
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{ margin: '0 auto', borderCollapse: 'collapse' }}
      >
        <tbody>
          <tr>
            <td
              style={{
                border: `1px solid ${MT.headerGlowRing}`,
                borderRadius: 16,
                padding: compact ? '16px 24px' : '20px 28px',
                backgroundColor: MT.pageBg,
              }}
            >
              <Text
                style={{
                  margin: '0 0 8px',
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: MT.textPrimary,
                  lineHeight: 1.2,
                }}
              >
                Mundo <span style={{ color: MT.gold }}>Tech</span>
              </Text>
              <Text
                style={{
                  margin: '0 0 16px',
                  fontSize: 13,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: MT.textMuted,
                }}
              >
                Conectados Contigo
              </Text>
              {name ? (
                <Text
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: MT.gold,
                  }}
                >
                  {name}
                </Text>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}
