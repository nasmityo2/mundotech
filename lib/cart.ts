import { prisma } from '@/lib/prisma';
import type { CartItemAPI } from '@/lib/definitions';

/** Selección base de campos de producto que expone la API de carrito. */
const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  originalPrice: true,
  stock: true,
  category: true,
  brand: true,
  images: true,
} as const;

/** Mapea un CartItem con producto incluido al shape CartItemAPI. */
function toCartItemAPI(item: {
  id: string;
  productId: string;
  quantity: number;
  product: {
    name: string;
    slug: string | null;
    price: number;
    originalPrice: number | null;
    stock: number;
    category: string;
    brand: string | null;
    images: string[];
  };
}): CartItemAPI {
  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    name: item.product.name,
    slug: item.product.slug,
    price: item.product.price,
    originalPrice: item.product.originalPrice,
    stock: item.product.stock,
    category: item.product.category,
    brand: item.product.brand,
    images: item.product.images,
  };
}

/**
 * Devuelve los ítems del carrito del usuario con datos de producto actualizados.
 * Si no tiene carrito, retorna array vacío.
 */
export async function getUserCart(userId: string): Promise<CartItemAPI[]> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: { select: PRODUCT_SELECT } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!cart) return [];

  return cart.items.map(toCartItemAPI);
}

/**
 * Inserta o actualiza un ítem en el carrito del usuario.
 * Si quantity <= 0, elimina el ítem.
 * No valida stock aquí — el cliente ya lo hace; validación de stock real ocurre en checkout.
 */
export async function upsertCartItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId, updatedAt: new Date() },
    update: { updatedAt: new Date() },
    select: { id: true },
  });

  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
    return;
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity },
    update: { quantity, updatedAt: new Date() },
  });
}

/** Elimina un ítem del carrito por productId. */
export async function removeCartItem(userId: string, productId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!cart) return;

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id, productId },
  });
}

/** Elimina todos los ítems del carrito del usuario. */
export async function clearUserCart(userId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!cart) return;

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
}

/**
 * Fusiona ítems locales (localStorage al hacer login) con el carrito en BD.
 * Estrategia: para cada producto, usa max(cantidad_local, cantidad_bd), capado al stock real.
 * Retorna el carrito resultante enriquecido con datos de producto.
 */
export async function mergeCart(
  userId: string,
  localItems: { productId: string; quantity: number }[],
): Promise<CartItemAPI[]> {
  // Si no hay ítems locales, simplemente devolvemos el carrito actual
  if (localItems.length === 0) {
    return getUserCart(userId);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Obtener o crear el carrito
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId, updatedAt: new Date() },
      update: { updatedAt: new Date() },
      include: { items: { select: { productId: true, quantity: true } } },
    });

    // Recopilar todos los productIds involucrados
    const allProductIds = [
      ...new Set([
        ...cart.items.map((i) => i.productId),
        ...localItems.map((i) => i.productId),
      ]),
    ];

    // Consultar stock actual de todos los productos
    const products = await tx.product.findMany({
      where: { id: { in: allProductIds } },
      select: { id: true, stock: true },
    });
    const stockMap = new Map(products.map((p) => [p.id, p.stock]));

    // Construir mapa merged: max(local, db), capado a stock
    const merged = new Map<string, number>(
      cart.items.map((i) => [i.productId, i.quantity]),
    );
    for (const local of localItems) {
      const stock = stockMap.get(local.productId) ?? 0;
      if (stock <= 0) continue;
      const current = merged.get(local.productId) ?? 0;
      merged.set(local.productId, Math.min(Math.max(current, local.quantity), stock));
    }

    // Aplicar el merge via upsert individual (la transacción garantiza atomicidad)
    for (const [productId, quantity] of merged.entries()) {
      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        create: { cartId: cart.id, productId, quantity },
        update: { quantity, updatedAt: new Date() },
      });
    }

    return cart.id;
  });

  // Devolvemos el carrito completo post-merge con datos de producto frescos
  const finalCart = await prisma.cart.findUnique({
    where: { id: result },
    include: {
      items: {
        include: { product: { select: PRODUCT_SELECT } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return finalCart ? finalCart.items.map(toCartItemAPI) : [];
}
