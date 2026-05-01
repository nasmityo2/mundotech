import { Text } from '@react-email/components';
import * as React from 'react';
import { roundMoney2 } from '@/lib/exchange-rate';
import { formatEmailBs, formatEmailUsd } from '../format-money';
import { MT, fontSans } from '../theme';

type Props = {
  amountUsd: number;
  exchangeRateUsdBs: number | null | undefined;
  bold?: boolean;
  fontSize?: number;
};

/** Una sola línea tipo mockup: USD … | Bs.S … */
export function DualMoneyInline({ amountUsd, exchangeRateUsdBs, bold, fontSize = 14 }: Props) {
  const rate =
    exchangeRateUsdBs != null && exchangeRateUsdBs > 0 ? exchangeRateUsdBs : null;
  const usd = formatEmailUsd(amountUsd);
  if (rate == null) {
    return (
      <Text
        style={{
          margin: 0,
          fontFamily: fontSans,
          fontWeight: bold ? 700 : 600,
          fontSize,
          color: MT.textPrimary,
        }}
      >
        {usd}
      </Text>
    );
  }
  const bs = formatEmailBs(roundMoney2(amountUsd * rate));
  return (
    <Text
      style={{
        margin: 0,
        fontFamily: fontSans,
        fontWeight: bold ? 700 : 600,
        fontSize,
        color: MT.textPrimary,
      }}
    >
      {usd}
      <span style={{ color: MT.textMuted, fontWeight: bold ? 700 : 400 }}>{' | '}</span>
      <span style={{ color: bold ? MT.textPrimary : MT.textMuted }}>{bs}</span>
    </Text>
  );
}
