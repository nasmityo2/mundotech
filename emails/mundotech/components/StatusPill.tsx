import { Text } from '@react-email/components';
import * as React from 'react';
import { MT, fontSans } from '../theme';

type Tone = 'neutral' | 'success';

export function StatusPill({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  const bg =
    tone === 'success' ? 'rgba(72, 187, 120, 0.18)' : 'rgba(148, 163, 184, 0.12)';
  const fg = tone === 'success' ? MT.success : MT.textMuted;

  return (
    <Text style={{ margin: '0 0 16px' }}>
      <span
        style={{
          display: 'inline-block',
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: fontSans,
          color: fg,
          backgroundColor: bg,
          borderRadius: 999,
          border: `1px solid ${MT.border}`,
        }}
      >
        {children}
      </span>
    </Text>
  );
}
