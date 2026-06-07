import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { readSettings } from '@/lib/data-store';
import { code128 } from '@/lib/barcode-code128';
import LabelControls from './LabelControls';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function OrderLabelPage({ params }: PageProps) {
  const { id } = await params;
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
    readSettings(),
  ]);

  if (!order) notFound();

  const orderRef = String(order.orderNumber).padStart(4, '0');
  const barcode = code128(orderRef, { moduleWidth: 2, height: 56, quietZone: 8 });
  const itemCount = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const isMrw = /mrw/i.test(order.shippingAddress) || /mrw/i.test(order.trackingCarrier ?? '');

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      {/* CSS de impresión: oculta el chrome del admin y fija el tamaño térmico */}
      <style>{`
        @media print {
          @page { size: 100mm 150mm; margin: 0; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #thermal-label, #thermal-label * { visibility: visible !important; }
          #thermal-label {
            position: absolute !important;
            left: 0; top: 0;
            width: 100mm !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-[420px] mx-auto">
        <LabelControls />

        {/* Etiqueta — ~100mm de ancho */}
        <div
          id="thermal-label"
          className="bg-white text-black mx-auto border border-black/80"
          style={{ width: '100mm', padding: '4mm', fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {/* Cabecera */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '2mm' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1 }}>{settings.storeName}</div>
              <div style={{ fontSize: '9px', marginTop: '1mm' }}>Etiqueta de envío</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px' }}>Pedido</div>
              <div style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1 }}>#{orderRef}</div>
              <div style={{ fontSize: '9px' }}>{formatDate(order.createdAt)}</div>
            </div>
          </div>

          {/* Destinatario */}
          <div style={{ marginTop: '3mm' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destinatario</div>
            <div style={{ fontSize: '17px', fontWeight: 800, lineHeight: 1.15, marginTop: '0.5mm' }}>{order.customerName}</div>
            <div style={{ fontSize: '12px', marginTop: '1mm', lineHeight: 1.35 }}>
              {order.customerIdNumber && <div>C.I./RIF: {order.customerIdNumber}</div>}
              {order.customerPhone && <div>Tel: {order.customerPhone}</div>}
            </div>
            <div style={{ fontSize: '13px', marginTop: '1.5mm', lineHeight: 1.35, fontWeight: 600 }}>
              <div>{order.shippingAddress}</div>
              <div>
                {[order.shippingCity, order.shippingState].filter((s) => s && s !== 'N/A').join(', ')}
              </div>
              <div>{order.shippingCountry}</div>
            </div>
          </div>

          {/* Transportista / método */}
          <div style={{ marginTop: '2.5mm', display: 'flex', gap: '3mm', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '2mm 0' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>Envío</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>
                {order.trackingCarrier || (isMrw ? 'MRW' : 'Retiro / Encomienda')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>Bultos</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{itemCount} art.</div>
            </div>
          </div>

          {order.trackingNumber && (
            <div style={{ marginTop: '1.5mm', fontSize: '12px' }}>
              <span style={{ fontWeight: 700 }}>Guía: </span>
              <span style={{ fontFamily: 'monospace' }}>{order.trackingNumber}</span>
            </div>
          )}

          {/* Código de barras */}
          <div style={{ marginTop: '3mm', textAlign: 'center' }}>
            <svg
              width="100%"
              height={barcode.height}
              viewBox={`0 0 ${barcode.width} ${barcode.height}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Código de barras del pedido ${orderRef}`}
            >
              <rect x={0} y={0} width={barcode.width} height={barcode.height} fill="#fff" />
              {barcode.bars.map((b, i) => (
                <rect key={i} x={b.x} y={0} width={b.width} height={barcode.height} fill="#000" />
              ))}
            </svg>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', letterSpacing: '2px', marginTop: '0.5mm' }}>
              {orderRef}
            </div>
          </div>

          {/* Remitente */}
          <div style={{ marginTop: '3mm', borderTop: '1px solid #000', paddingTop: '2mm', fontSize: '10px', lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>Remite: </span>
            {settings.storeName}
            {settings.phone ? ` · ${settings.phone}` : ''}
            {settings.address ? ` · ${settings.address}` : ''}
          </div>
        </div>

        <p className="no-print text-center text-xs text-gray-400 mt-4">
          Configura tu impresora térmica a 100×150&nbsp;mm (4×6&quot;). El navegador recordará el tamaño tras la primera impresión.
        </p>
      </div>
    </div>
  );
}
