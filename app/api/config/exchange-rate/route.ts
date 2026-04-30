import { NextResponse } from 'next/server';
import { getExchangeRate } from '@/app/actions/configActions';

export const dynamic = 'force-dynamic';

/** Endpoint público — devuelve la tasa USD/Bs actual siempre fresca. */
export async function GET() {
  const rate = await getExchangeRate();
  return NextResponse.json({ rate }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
