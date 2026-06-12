import Papa from 'papaparse';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import type { OrderStatus } from '@/lib/definitions';

/**
 * GET /api/orders/export.csv?tab=<all|pending|paid|processing|shipped|completed>&q=<texto>
 *
 * Export de pedidos generado en servidor (solo admin).
 * - PRD-213: funciona sin JavaScript (enlace directo descargable).
 * - PRD-156: el export contiene PII → queda registrado en el log del servidor
 *   quién exportó, cuántas filas y con qué filtros.
 * - PRD-084: la UI pasa el filtro activo de forma explícita; el archivo refleja
 *   exactamente la vista confirmada por el operador.
 */

const TAB_STATUSES: Record<string, OrderStatus[]> = {
  pending:    ['Pendiente', 'Pendiente verificación Binance'],
  paid:       ['En Proceso', 'Enviado', 'Entregado'],
  processing: ['En Proceso'],
  shipped:    ['Enviado'],
  completed:  ['Entregado'],
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') ?? 'all';
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();

  const statuses = TAB_STATUSES[tab];
  const orders = await prisma.order.findMany({
    where:   statuses ? { status: { in: statuses } } : undefined,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  const filtered = q
    ? orders.filter(
        o =>
          String(o.orderNumber).includes(q) ||
          o.customerName.toLowerCase().includes(q),
      )
    : orders;

  // PRD-156: auditoría del acceso a PII
  console.info(
    '[orders-export] admin=%s filas=%d tab=%s busqueda=%s fecha=%s',
    auth.session.user?.email ?? 'desconocido',
    filtered.length,
    tab,
    q ? 'sí' : 'no',
    new Date().toISOString(),
  );

  const rows = filtered.map(o => ({
    Pedido: String(o.orderNumber).padStart(4, '0'),
    Fecha: o.createdAt.toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
    Cliente: o.customerName,
    Email: o.customerEmail ?? '',
    Teléfono: o.customerPhone ?? '',
    Estado: o.status,
    'Método de pago': o.paymentMethod,
    Banco: o.paymentBank ?? '',
    Referencia: o.paymentReference ?? '',
    'Total (Bs/USD)': o.total,
    'Tasa USD/Bs': o.exchangeRateUsdBs ?? '',
    Tracking: o.trackingNumber ?? '',
    Transportista: o.trackingCarrier ?? '',
    Ciudad: o.shippingCity,
    'Estado/Región': o.shippingState,
    Artículos: o.items.map(i => `${i.quantity}× ${i.productName}`).join(' | '),
  }));

  const csv = Papa.unparse(rows, { quotes: true });
  const stamp = new Date().toISOString().slice(0, 10);

  // BOM para que Excel respete acentos (mismo criterio que lib/csv-export.ts)
  return new Response(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pedidos-mundotech-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
