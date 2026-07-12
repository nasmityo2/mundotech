/**
 * e2e-reset-db.ts
 *
 * Resetea y siembra la BD de E2E con datos deterministas.
 * SEGURIDAD: aborta si DATABASE_URL NO contiene "_e2e" ni "test" y no es CI.
 * Uso: tsx scripts/e2e-reset-db.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL || '';
const IS_CI = !!process.env.CI;

if (!DATABASE_URL.includes('_e2e') && !DATABASE_URL.includes('test') && !IS_CI) {
  console.error(
    `[E2E-SAFETY] DATABASE_URL (${DATABASE_URL.slice(0, 40)}…) no contiene "_e2e" ni "test". ` +
    'Este script solo puede ejecutarse contra BD de E2E. Abortando.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('[e2e-reset] Limpiando BD...');

  // Orden de borrado respetando FKs
  await prisma.couponRedemption.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productView.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.abandonedCart.deleteMany();
  await prisma.restockSubscription.deleteMany();
  await prisma.videoJob.deleteMany();
  await prisma.paymentUpload.deleteMany();
  await prisma.user.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.appConfig.deleteMany();
  await prisma.productMedia.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.savedAddress.deleteMany();

  console.log('[e2e-reset] BD limpiada. Sembrando datos...');

  // ── Admin ──
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Test',
      email: 'admin@mundotechtest.com',
      password: '$2b$06$e2e.admin.hashed.password.deterministic.abc123',
      role: 'ADMIN',
    },
  });
  console.log(`  Admin: ${admin.email} (id=${admin.id})`);

  // ── CLIENT ──
  const client = await prisma.user.create({
    data: {
      name: 'Cliente Test',
      email: 'cliente@mundotechtest.com',
      password: '$2b$06$e2e.client.hashed.password.deterministic.xyz789',
      role: 'CLIENT',
    },
  });
  console.log(`  CLIENT: ${client.email} (id=${client.id})`);

  // ── Productos ──
  const product1 = await prisma.product.create({
    data: {
      name: 'Audífonos Bluetooth Test',
      slug: 'audifonos-bluetooth-test',
      description: 'Audífonos inalámbricos con cancelación de ruido para pruebas E2E.',
      price: 45.99,
      stock: 10,
      category: 'Electrónicos',
      brand: 'TestBrand',
      images: ['https://cdn.e2e.test/audifonos.jpg'],
      isActive: true,
    },
  });
  console.log(`  Producto 1: ${product1.name} (stock=${product1.stock})`);

  const product2 = await prisma.product.create({
    data: {
      name: 'Cargador USB-C Test',
      slug: 'cargador-usb-c-test',
      description: 'Cargador rápido 65W para pruebas E2E.',
      price: 15.50,
      stock: 0, // sin stock — probar flujo sin stock
      category: 'Accesorios',
      brand: 'TestBrand',
      images: ['https://cdn.e2e.test/cargador.jpg'],
      isActive: true,
    },
  });
  console.log(`  Producto 2: ${product2.name} (stock=${product2.stock})`);

  // ── Cupón ──
  const coupon = await prisma.coupon.create({
    data: {
      code: 'E2E10',
      description: '10% off para pruebas E2E',
      discountType: 'PERCENT',
      discountValue: 10,
      minPurchase: 20,
      maxDiscount: 10,
      maxUses: 100,
      usedCount: 0,
      active: true,
    },
  });
  console.log(`  Cupón: ${coupon.code}`);

  // ── AppConfig settings ──
  await prisma.appConfig.create({
    data: {
      key: 'store_settings',
      value: JSON.stringify({
        storeName: 'MundoTech E2E',
        tagline: 'Tienda de pruebas E2E',
        phone: '0412-0000000',
        email: 'e2e@mundotechtest.com',
        address: 'Dirección de prueba E2E',
        pagoMovil: { bank: 'TestBank', phone: '0412-0000000', idNumber: 'V-00000000' },
        transferencia: { bank: 'TestBank', accountNumber: '0000-0000-00-00000000', accountHolder: 'Test E2E', rif: 'J-00000000-0' },
        binancePayId: '',
        binanceQrUrl: '',
        labelWidthMm: 100,
        labelHeightMm: 150,
        whatsappOrderPhone: '',
      }),
    },
  });
  console.log('[e2e-reset] AppConfig sembrado.');

  console.log('[e2e-reset] Seed completado.');
  console.log('  Admin email: admin@mundotechtest.com');
  console.log('  Admin password: admin-e2e-pass (login manual)');
  console.log('  CLIENT email: cliente@mundotechtest.com');
  console.log('  CLIENT password: cliente-e2e-pass (login manual)');
  console.log('  Cupón: E2E10 (10% hasta $10 de descuento, min $20)');
  console.log('  Producto con stock:  "Audífonos Bluetooth Test" (stock=10)');
  console.log('  Producto sin stock:   "Cargador USB-C Test" (stock=0)');
}

main()
  .catch((e) => {
    console.error('[e2e-reset] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
