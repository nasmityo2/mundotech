import { NextResponse } from 'next/server';
import { getExchangeRate } from '@/app/actions/configActions';

/** Endpoint público — devuelve la tasa USD/Bs actual. */
export async function GET() {
  const rate = await getExchangeRate();
  return NextResponse.json({ rate }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
