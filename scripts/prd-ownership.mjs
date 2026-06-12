/**
 * Propietario único de cada PRD para segmentación sin colisiones en trabajo paralelo.
 * 01=Seguridad 02=Checkout 03=Infra 04=UX-Cliente 05=Admin 06=Emails
 */
const SEGMENT_04 = new Set([
  8, 37, 38, 53, 54, 55, 61, 62, 63, 67, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
  87, 88, 92, 93, 94, 95, 96, 97, 98, 99, 100, 112, 113, 114, 115, 116, 117, 120,
  135, 136, 161, 162, 163, 164, 165, 166, 167, 168, 214, 215, 234, 235, 236, 258,
  260, 271, 272, 273, 275, 276, 277, 285, 289, 290,
]);

const SEGMENT_05 = new Set([
  39, 66, 81, 82, 83, 84, 85, 86, 137, 138, 139, 153, 154, 155, 156, 182, 183, 184,
  208, 209, 210, 213, 216, 219, 220, 221, 222, 223, 225, 226, 227, 229, 230, 244,
  245, 246, 247, 248, 266, 267, 268, 269, 270, 274, 286, 287,
]);

const SEGMENT_06 = new Set([
  50, 51, 52, 109, 110, 111, 207, 249, 250, 251, 252, 253, 254, 288,
]);

/** Overrides explícitos (conflictos entre categorías / movimientos anti-colisión) */
const EXPLICIT = {
  7: '01',
  10: '01',
  14: '01', 15: '01', 89: '01', 90: '01', 91: '01',
  48: '01',
  60: '01',
  70: '02',
  64: '03', 65: '03',
  101: '03', 106: '03', 108: '01', 140: '03', 143: '03',
  178: '03', 204: '03', 217: '03', 232: '03',
  212: '01',
  211: '03',
  218: '02',
  224: '01',
  228: '01',
  233: '03',
  243: '02',
  255: '01', 256: '01', 257: '01', 259: '01',
  278: '01', 279: '01', 280: '01', 281: '01', 282: '01', 283: '01', 284: '01',
};

function ownerFromRanges(n) {
  if (n <= 4) return n === 2 ? '02' : n === 3 || n === 4 ? '03' : '01';
  if (n >= 5 && n <= 20) return '01';
  if (n >= 102 && n <= 104) return '01';
  if (n === 118 || n === 119) return '01';
  if (n >= 21 && n <= 30) return '02';
  if (n >= 31 && n <= 36) return '03';
  if (n === 40) return '03';
  if (n >= 41 && n <= 48) return '01';
  if (n === 49) return '02';
  if (n >= 57 && n <= 59) return '03';
  if (n === 68 || n === 69) return '02';
  if (n === 105) return '02';
  if (n >= 121 && n <= 127) return '03';
  if (n >= 128 && n <= 134) return '02';
  if (n === 107 || n === 141 || n === 142) return '03';
  if (n >= 146 && n <= 152) return '03';
  if (n >= 157 && n <= 160) return '02';
  if (n >= 169 && n <= 174) return '01';
  if (n >= 175 && n <= 181) return '02';
  if (n >= 185 && n <= 189) return '03';
  if (n >= 190 && n <= 206) return '02';
  if (n >= 231 && n <= 236) {
    if (SEGMENT_04.has(n)) return '04';
    return '02';
  }
  if (n >= 237 && n <= 242) return '01';
  if (n >= 261 && n <= 265) return '01';
  if (n === 56 || n === 144 || n === 145) return '03';
  if (n === 1) return '01';
  if (n === 2) return '02';
  return null;
}

export function getPrdOwner(id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n < 1 || n > 290) return null;
  if (EXPLICIT[n]) return EXPLICIT[n];
  if (SEGMENT_04.has(n)) return '04';
  if (SEGMENT_05.has(n)) return '05';
  if (SEGMENT_06.has(n)) return '06';
  return ownerFromRanges(n);
}

export const SEGMENT_META = {
  '01': {
    file: 'ANALISIS-PRODUCCION-01-SEGURIDAD.md',
    title: 'Seguridad, autenticación y superficie pública',
    short: '01-SEGURIDAD',
    order: 'Bloqueadores PRD-001, 005, 006, 007 → auth/API → PRD-169–174, 224, 228, 237–242, 278–284',
    excludeFiles: [
      ['lib/checkout-order.ts', '02', 'Lógica stock/cupón/checkout (salvo validación paymentProofUrl PRD-007)'],
      ['lib/coupons.ts', '02', 'Redeem/revert cupones'],
      ['lib/data-store.ts', '03', 'Settings/DEFAULT_SETTINGS'],
      ['context/CartContext.tsx (resto)', '04', 'Solo permitido aquí para PRD-261 y PRD-263 (cleanup signOut)'],
      ['emails/mundotech/*.tsx', '06', 'Templates email'],
      ['app/admin/**', '05', 'Panel admin'],
      ['schema.prisma', '03', 'Modelo de datos'],
    ],
    s18: ['18.2 Auth', 'Auth, registro'],
    s20: ['20.2 Auth'],
    s21: ['21.3 APIs GET', '21.4 Seguridad'],
    s3: ['3.3 Superficie de ataque resumida'],
    s6: ['Seguridad (PRD-009–020'],
    s7: ['API y validación'],
    blockers: ['001', '005 / PRD-102', '006', '007'],
    smoke: [
      ['12', 'Pedido ajeno en `/checkout/success?orderId=` → 403', 'PRD-001'],
      ['10', 'Reset password + rate limit', 'PRD-170'],
      ['18', 'Email case-insensitive login/registro', 'PRD-169, 237, 238'],
    ],
  },
  '02': {
    file: 'ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md',
    title: 'Checkout, pagos, inventario y finanzas',
    short: '02-CHECKOUT',
    order: 'Bloqueadores PRD-002, 175, 190 → checkout → carrito abandonado → PRD-218, 243',
    excludeFiles: [
      ['middleware.ts', '01', 'Auth, CSRF, rate limit'],
      ['app/actions/authActions.ts', '01', 'Registro/login/reset'],
      ['emails/mundotech/*.tsx', '06', 'Templates email (montos vienen de 02)'],
      ['context/CartContext.tsx', '04', 'UX carrito (validación stock en API es 02 PRD-105)'],
      ['app/admin/orders/page.tsx', '05', 'UI optimista bulk (lógica estados es 02)'],
      ['lib/rate-limit.ts', '01', 'Rate limiting global'],
      ['schema.prisma', '03', 'Fix PRD-178, PRD-204 implementado en 03 — aquí solo documentar síntoma'],
    ],
    s3: ['3.1 Flujo de compra', '3.2 Máquina de estados de pedido'],
    s18: ['18.1 Nuevos bloqueadores', '18.3 Carrito abandonado', '18.6 Pedidos admin', '18.7 Dinero'],
    s20: [],
    s21: [],
    s6: ['Checkout y UX financiera'],
    s7: ['Cupones'],
    blockers: ['002', '175', '190'],
    smoke: [
      ['1–6', 'Compra PM/Transfer/Binance, cupón, stock concurrente', 'PRD-021–031, 157'],
      ['13', 'Cancelar Enviado NO restaura stock', 'PRD-002'],
      ['16', 'Email abandono → carrito rehidratado', 'PRD-175'],
      ['17', 'Cancelar pedido revierte usedCount cupón', 'PRD-190'],
      ['19', 'Admin stats = dashboard revenue', 'PRD-205, 220'],
    ],
  },
  '03': {
    file: 'ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md',
    title: 'Infraestructura, datos, caché y calidad',
    short: '03-INFRA',
    order: 'Bloqueadores PRD-003, 004, 101, 140 → schema.prisma (PRD-178, 204, 217, 232) → CI/Sentry → ISR',
    excludeFiles: [
      ['lib/checkout-order.ts', '02', 'Transacción checkout'],
      ['middleware.ts', '01', 'CSP/headers'],
      ['app/actions/productActions.ts', '05', 'Admin productos/CSV/slug (PRD-066 implementado en 05)'],
    ],
    s18: ['18.5 Categorías'],
    s20: [],
    s21: [],
    s6: ['Infra y calidad'],
    s7: ['Prisma y datos', 'Caché'],
    blockers: ['003 / PRD-143', '004', '101', '140'],
    smoke: [],
    prdNotes: {
      101: '> **Nota anti-colisión:** Mismo root cause que PRD-039 (documentado en 05-ADMIN) y PRD-106 — datos bancarios ficticios en DEFAULT_SETTINGS.',
      106: '> **Nota anti-colisión:** Ver también PRD-101 y PRD-039 (05-ADMIN, solo documental) — mismo root cause.',
      178: '> **Nota anti-colisión:** Movido desde 02-CHECKOUT — único dueño de `schema.prisma`.',
      204: '> **Nota anti-colisión:** Movido desde 02-CHECKOUT — único dueño de `schema.prisma`.',
      217: '> **Nota anti-colisión:** Movido desde 04/05 — dominio admin/reviews pero fix en schema.prisma (03).',
      232: '> **Nota anti-colisión:** Movido desde 04/05 — dominio admin/cart pero fix en schema.prisma (03).',
    },
  },
  '04': {
    file: 'ANALISIS-PRODUCCION-04-UX-CLIENTE.md',
    title: 'UX cliente, contextos React y accesibilidad',
    short: '04-UX-CLIENTE',
    order: 'Contextos → Navbar/carrito → cuenta → reseñas cliente → PRD-276+',
    excludeFiles: [
      ['lib/checkout-order.ts', '02', 'Transacción'],
      ['lib/coupons.ts', '02', 'Cupones'],
      ['middleware.ts', '01', 'CSP/rutas'],
      ['lib/data-store.ts', '03', 'Settings BD'],
      ['schema.prisma', '03', 'Modelo datos'],
      ['app/actions/productActions.ts', '05', 'Admin productos'],
      ['app/admin/**', '05', 'Páginas admin'],
      ['emails/mundotech/**', '06', 'Templates email'],
      ['lib/resend.tsx (resto)', '01 / 02 / 06', 'Solo secciones de este segmento si aplica'],
      ['CartContext.tsx lógica logout', '01', 'PRD-261, PRD-263 pertenecen a 01'],
    ],
    s18: ['18.4 Analytics', '18.8 Reseñas', '18.10 Cuarta pasada'],
    s20: ['20.1 Producto', '20.7 Tracking', '20.8 Tipos'],
    s21: ['21.2 UX', '21.5 Claims', '21.8 Recomendaciones'],
    s6: ['UX y confianza'],
    s7: ['Cuenta, búsqueda, reseñas', 'Contextos y carrito', 'Contenido y componentes'],
    blockers: [],
    smoke: [
      ['7–8', 'Carrito + wishlist UX', 'PRD-096–098'],
      ['9', 'Reseña cliente', 'PRD-161'],
      ['14', 'Registro + login + logout carrito', 'PRD-261 (ver 01)'],
    ],
  },
  '05': {
    file: 'ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md',
    title: 'Admin UI, operaciones, analytics y reporting',
    short: '05-ADMIN',
    order: 'Admin UI → CSV/slug → analytics → reseñas admin → PRD-266+',
    excludeFiles: [
      ['lib/checkout-order.ts', '02', 'Transacción (PRD-218 → 02)'],
      ['lib/coupons.ts', '02', 'Cupones (PRD-243 → 02)'],
      ['lib/data-store.ts', '03', 'PRD-039 documentado aquí pero fix en 03 (PRD-101, 106)'],
      ['schema.prisma', '03', 'PRD-217, PRD-232 → fix en 03'],
      ['middleware.ts', '01', 'CSP/rutas'],
      ['app/actions/authActions.ts', '01', 'PRD-228 → 01'],
      ['reset-password/page.tsx', '01', 'PRD-224 → 01'],
      ['emails/mundotech/**', '06', 'Templates'],
      ['lib/resend.tsx', '01 / 02 / 06', 'Envío — solo secciones de este segmento'],
      ['context/CartContext.tsx', '04', 'Contextos cliente'],
    ],
    s18: ['18.6 Pedidos admin', '18.9 Cron'],
    s20: ['20.3 Admin', '20.8 Tipos'],
    s21: ['21.6 Analytics'],
    s6: ['Admin operaciones'],
    s7: ['Admin operaciones'],
    blockers: [],
    smoke: [
      ['19', 'Admin stats = dashboard revenue', 'PRD-205, 220'],
    ],
    prdNotes: {
      39: '> **Nota anti-colisión:** El fix de este PRD vive en 03-INFRA (mismo archivo que PRD-101 y PRD-106). Este segmento documenta el síntoma desde la perspectiva del admin UI. **No editar `lib/data-store.ts` desde aquí.**',
      66: '> **Nota anti-colisión:** Movido desde 03-INFRA — `productActions.ts` pertenece a este segmento.',
    },
  },
  '06': {
    file: 'ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md',
    title: 'Emails transaccionales, notificaciones y contenido de comunicaciones',
    short: '06-EMAILS',
    order: 'Templates confirmación → validación → envío → cancelación → PRD-288',
    excludeFiles: [
      ['lib/resend.tsx sección abandoned-cart', '02', 'PRD-175–181'],
      ['lib/resend.tsx fallback domain', '01', 'PRD-020'],
      ['lib/checkout-order.ts', '02', 'Transacción'],
      ['lib/abandoned-cart.ts', '02', 'Token recovery'],
      ['app/actions/authActions.ts', '01', 'Auth'],
      ['middleware.ts', '01', 'CSP'],
      ['app/admin/**', '05', 'Admin UI'],
    ],
    s18: [],
    s20: ['20.4 Emails'],
    s21: ['21.7 Emails'],
    s6: ['Emails y notificaciones'],
    s7: ['Emails y notificaciones'],
    blockers: [],
    smoke: [
      ['20', 'Email confirmación CTA guest', 'PRD-207, 249, 250'],
    ],
  },
};

export function prdsForOwner(owner) {
  const ids = [];
  for (let i = 1; i <= 290; i++) {
    if (getPrdOwner(i) === owner) ids.push(i);
  }
  return ids;
}

export function formatPrdRanges(ids) {
  if (!ids.length) return '—';
  const ranges = [];
  let start = ids[0];
  let prev = ids[0];
  for (let i = 1; i <= ids.length; i++) {
    const cur = ids[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push(
      start === prev
        ? `PRD-${String(start).padStart(3, '0')}`
        : `PRD-${String(start).padStart(3, '0')}–${String(prev).padStart(3, '0')}`
    );
    start = cur;
    prev = cur;
  }
  return ranges.join(', ');
}

/** Valida propiedad única 1–290 */
export function validateOwnership() {
  const errors = [];
  for (let i = 1; i <= 290; i++) {
    const o = getPrdOwner(i);
    if (!o) errors.push(`PRD-${String(i).padStart(3, '0')} sin asignar`);
  }
  for (const owner of Object.keys(SEGMENT_META)) {
    const expected = owner === '04' ? 64 : owner === '05' ? 46 : owner === '06' ? 14 : null;
    if (expected !== null) {
      const count = prdsForOwner(owner).length;
      if (count !== expected) {
        errors.push(`Segmento ${owner}: esperados ${expected} PRDs, hay ${count}`);
      }
    }
  }
  return errors;
}
