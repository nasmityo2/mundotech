'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminAction } from '@/lib/api-auth';
import { z } from 'zod';
import Papa from 'papaparse';
import { slugify } from '@/lib/slugify';
import { Prisma, ProductMediaType } from '@prisma/client';
import { deriveLegacyImagesFromSlots } from '@/lib/product-media';
import { triggerRestockNotifications } from '@/app/actions/restockActions';
import { parseProductSpecs } from '@/lib/definitions';
import { saveSlugRedirect } from '@/lib/slug-redirects';
import { d } from '@/lib/decimal';

const absoluteUrl = z.string().refine(
  (s) => {
    try {
      const u = new URL(s);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'URL inválida' },
);

/** Slots de galería enviados desde el modal (imágenes + vídeo Bunny). */
const gallerySlotSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('IMAGE'), url: absoluteUrl }),
  z.object({
    type: z.literal('VIDEO'),
    url: absoluteUrl,
    posterUrl: z.union([absoluteUrl, z.literal('')]).optional(),
  }),
]);

function parseSpecsFromFormData(formData: FormData) {
  const raw = formData.get('specsJson');
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    return parseProductSpecs(JSON.parse(raw));
  } catch {
    return [];
  }
}

function parseGallerySlots(
  formData: FormData,
  imageUrls: string[],
): z.infer<typeof gallerySlotSchema>[] {
  const raw = formData.get('mediaJson');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = z.array(gallerySlotSchema).max(6).safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.length > 0) return parsed.data;
    } catch {
      /* ignore */
    }
  }
  const base = imageUrls.length > 0 ? imageUrls : ['/placeholder-product.png'];
  return base.map((url) => ({ type: 'IMAGE' as const, url }));
}

const productSchema = z.object({
  name:        z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  price:       z.coerce.number().positive('El precio debe ser un número positivo'),
  stock:       z.coerce.number().int().nonnegative('El stock debe ser un entero no negativo'),
  category:    z.string().min(1, 'La categoría es obligatoria'),
  brand:       z.string().min(1, 'La marca es obligatoria'),
  sku: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().min(1).nullable().optional()
  ),
  // imagesJson: JSON array of URLs sent from the modal
  imagesJson: z.preprocess(
    (v) => {
      if (typeof v !== 'string' || v.trim() === '') return [];
      try { return JSON.parse(v); } catch { return []; }
    },
    z.array(z.string().url('URL de imagen inválida')).max(6).default([])
  ),
});

async function verifyAdminSession() {
  return requireAdminAction();
}

/** Genera un slug único para un nuevo producto consultando la BD. */
async function getUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  if (!base) return `producto-${Date.now()}`;

  let candidate = base;
  let counter   = 2;

  while (true) {
    const existing = await prisma.product.findUnique({
      where:  { slug: candidate },
      select: { id: true },
    });
    // Si no existe, o el que existe es el mismo producto que estamos editando → OK
    if (!existing || existing.id === excludeId) break;
    candidate = `${base}-${counter}`;
    counter++;
  }

  return candidate;
}

export async function createProductAction(formData: FormData) {
  try {
    await verifyAdminSession();

    const data = {
      name:        formData.get('name'),
      description: formData.get('description'),
      price:       formData.get('price'),
      stock:       formData.get('stock'),
      category:    formData.get('category'),
      brand:       formData.get('brand'),
      sku:         formData.get('sku'),
      imagesJson:  formData.get('imagesJson'),
    };

    const validated = productSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, message: validated.error.issues.map(e => e.message).join(', ') };
    }

    const slots  = parseGallerySlots(formData, validated.data.imagesJson);
    const images = deriveLegacyImagesFromSlots(slots);
    const specs  = parseSpecsFromFormData(formData);

    const { imagesJson: _, sku, ...rest } = validated.data;
    const slug = await getUniqueSlug(validated.data.name);

    await prisma.product.create({
      data: {
        ...rest,
        slug,
        sku:   sku ?? null,
        images,
        // Cast requerido: los interfaces TS no satisfacen InputJsonValue de Prisma
        specs: specs.length > 0 ? (specs as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        media: {
          create: slots.map((s, i) => ({
            type: s.type === 'VIDEO' ? ProductMediaType.VIDEO : ProductMediaType.IMAGE,
            url: s.url,
            posterUrl:
              s.type === 'VIDEO' ? (s.posterUrl?.trim() ? s.posterUrl.trim() : null) : null,
            sortOrder: i,
          })),
        },
      },
    });

    revalidatePath('/admin/products');
    revalidatePath('/');
    revalidateTag('catalog', 'default');
    revalidateTag('categories', 'default'); // category product counts in sidebar
    return { success: true, message: 'Producto añadido con éxito.' };
  } catch (error) {
    console.error('Error al crear el producto:', error);
    if (error instanceof Error && error.message.startsWith('No autorizado')) {
      return { success: false, message: 'No tienes permiso para realizar esta acción.' };
    }
    return { success: false, message: 'No se pudo crear el producto.' };
  }
}

export async function updateProductAction(productId: string, formData: FormData) {
  try {
    await verifyAdminSession();

    const data = {
      name:        formData.get('name'),
      description: formData.get('description'),
      price:       formData.get('price'),
      stock:       formData.get('stock'),
      category:    formData.get('category'),
      brand:       formData.get('brand'),
      sku:         formData.get('sku'),
      imagesJson:  formData.get('imagesJson'),
    };

    const validated = productSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, message: validated.error.issues.map(e => e.message).join(', ') };
    }

    const slots  = parseGallerySlots(formData, validated.data.imagesJson);
    const images = deriveLegacyImagesFromSlots(slots);
    const specs  = parseSpecsFromFormData(formData);

    const { imagesJson: _, sku, ...rest } = validated.data;

    const current = await prisma.product.findUnique({
      where:  { id: productId },
      select: { name: true, slug: true, stock: true, images: true },
    });
    const previousStock = current?.stock ?? 0;

    const slug = (current?.name !== validated.data.name || !current?.slug)
      ? await getUniqueSlug(validated.data.name, productId)
      : current.slug;

    await prisma.$transaction(async (tx) => {
      await tx.productMedia.deleteMany({ where: { productId } });
      await tx.product.update({
        where: { id: productId },
        data: {
          ...rest,
          slug,
          sku:   sku ?? null,
          images,
          specs: specs.length > 0 ? (specs as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          media: {
            create: slots.map((s, i) => ({
              type: s.type === 'VIDEO' ? ProductMediaType.VIDEO : ProductMediaType.IMAGE,
              url: s.url,
              posterUrl:
                s.type === 'VIDEO' ? (s.posterUrl?.trim() ? s.posterUrl.trim() : null) : null,
              sortOrder: i,
            })),
          },
        },
      });
    });

    // Notificar suscriptores si el producto pasó de agotado a disponible
    if (previousStock === 0 && validated.data.stock > 0) {
      void triggerRestockNotifications(
        productId,
        validated.data.name,
        slug,
        images[0] ?? null,
        validated.data.price,
      );
    }

    // PRD-066: al renombrar el slug, registrar redirect 301 para que la URL
    // vieja (indexada o compartida) siga funcionando en la ficha de producto.
    const slugChanged = !!current?.slug && current.slug !== slug;
    if (slugChanged && current?.slug) {
      await saveSlugRedirect(current.slug, slug);
    }

    revalidatePath('/admin/products');
    revalidatePath('/');
    revalidatePath(`/product/${slug}`);
    if (slugChanged && current?.slug) revalidatePath(`/product/${current.slug}`);
    revalidateTag('catalog', 'default');
    return { success: true, message: 'Producto actualizado con éxito.' };
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    if (error instanceof Error && error.message.startsWith('No autorizado')) {
      return { success: false, message: 'No tienes permiso para realizar esta acción.' };
    }
    return { success: false, message: 'No se pudo actualizar el producto.' };
  }
}

/** Estados de pedido que mantienen el inventario reservado (no terminales). */
const NON_TERMINAL_ORDER_STATUSES = [
  'Pendiente',
  'Pendiente verificación Binance',
  'En Proceso',
  'Enviado',
] as const;

export async function deleteProductAction(
  productId: string,
  opts?: { forceIfActiveOrders?: boolean },
) {
  try {
    await verifyAdminSession();

    // PRD-231: verificar que no existan pedidos activos con este producto
    // antes de eliminar, para evitar ítems huérfanos sin FK.
    const activeOrderCount = await prisma.orderItem.count({
      where: {
        productId,
        order: {
          status: { in: NON_TERMINAL_ORDER_STATUSES as unknown as string[] },
        },
      },
    });

    if (activeOrderCount > 0 && !opts?.forceIfActiveOrders) {
      return {
        success: false,
        requiresConfirmation: true,
        activeOrderCount,
        message: `Este producto aparece en ${activeOrderCount} pedido${activeOrderCount !== 1 ? 's' : ''} activo${activeOrderCount !== 1 ? 's' : ''} (no cancelados ni entregados). Eliminar el producto dejará esos ítems sin ficha. Confirma explícitamente si quieres continuar.`,
      };
    }

    const current = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });

    // PRD-233: revalidar la ficha y rutas de catálogo ANTES de borrar,
    // para que ISR invalide la caché y no sirva la página fantasma.
    if (current?.slug) {
      revalidatePath(`/product/${current.slug}`);
    }
    revalidatePath('/productos');
    revalidatePath('/');
    revalidateTag('catalog', 'default');
    revalidateTag('categories', 'default');

    await prisma.product.delete({ where: { id: productId } });

    revalidatePath('/admin/products');
    return { success: true, message: 'Producto eliminado con éxito.' };
  } catch (error) {
    console.error('Error al eliminar el producto:', error);
    if (error instanceof Error && error.message.startsWith('No autorizado')) {
      return { success: false, message: 'No tienes permiso para realizar esta acción.' };
    }
    return { success: false, message: 'No se pudo eliminar el producto.' };
  }
}

/**
 * Catálogo PÚBLICO (lo consume ProductContext sin auth).
 * PRD-012 / PRD-104: `select` acotado a los campos que la tienda muestra —
 * sin `sku`, `specs` ni timestamps internos. El inventario completo solo se
 * obtiene vía `getProductsAdmin()` (con sesión admin).
 */
export async function getProducts(searchTerm?: string, categoryFilter?: string) {
  const where: Record<string, unknown> = {};

  if (searchTerm) {
    where.name = { contains: searchTerm, mode: 'insensitive' };
  }
  if (categoryFilter) {
    where.category = categoryFilter;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id:            true,
      slug:          true,
      name:          true,
      description:   true,
      price:         true,
      originalPrice: true,
      stock:         true,
      category:      true,
      brand:         true,
      images:        true,
    },
  });

  const categories = await prisma.product
    .findMany({ distinct: ['category'], select: { category: true } })
    .then(res => res.map(p => p.category));

  return { products, categories };
}

// ── CSV Import ──────────────────────────────────────────────────────────────
// PRD-153: round-trip completo con el export del panel — el SKU es la clave de
//          upsert (el nombre solo es fallback para catálogos legados sin SKU).
// PRD-154: en productos existentes se actualizan TODOS los campos del archivo
//          (nombre, precio, stock, categoría, marca, descripción y SKU).
// PRD-155: aplicación transaccional todo-o-nada — un error revierte el import
//          completo, nunca queda inventario a medias.

/** Cabeceras aceptadas (canónicas en inglés + alias en español de exports previos). */
const CSV_HEADER_ALIASES: Record<string, string> = {
  sku: 'sku',
  name: 'name', nombre: 'name',
  brand: 'brand', marca: 'brand',
  category: 'category', categoria: 'category', 'categoría': 'category',
  price: 'price', precio: 'price', 'precio usd': 'price',
  stock: 'stock',
  description: 'description', descripcion: 'description', 'descripción': 'description',
  imageurl: 'imageUrl', imagen: 'imageUrl', 'image url': 'imageUrl',
};

function normalizeCsvHeader(header: string): string {
  const key = header.trim().toLowerCase();
  return CSV_HEADER_ALIASES[key] ?? header.trim();
}

const emptyToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const csvProductSchema = z.object({
  sku: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null),
    z.string().min(1).max(64).nullable(),
  ),
  name:  z.string().trim().min(1, 'name es obligatorio'),
  price: z.coerce.number().positive('price debe ser mayor que 0'),
  stock: z.coerce.number().int().nonnegative('stock debe ser un entero ≥ 0'),
  category:    z.preprocess(emptyToUndef, z.string().trim().min(1).default('General')),
  brand:       z.preprocess(emptyToUndef, z.string().trim().min(1).default('Sin Marca')),
  description: z.preprocess(emptyToUndef, z.string().trim().min(1).default('Sin descripción')),
  imageUrl: z.preprocess(
    emptyToUndef,
    z.string().trim()
      .refine((s) => s.startsWith('/') || /^https?:\/\//i.test(s), 'imageUrl inválida')
      .default('/placeholder-product.png'),
  ),
});

type CsvProductRow = z.infer<typeof csvProductSchema>;

/** Slug único que además evita duplicados dentro del mismo archivo importado. */
async function getUniqueSlugForImport(
  name: string,
  taken: Set<string>,
  excludeId?: string,
): Promise<string> {
  const base = slugify(name) || `producto-${Date.now()}`;
  let candidate = base;
  let counter = 2;
  while (true) {
    if (!taken.has(candidate)) {
      const existing = await prisma.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing || existing.id === excludeId) break;
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
  taken.add(candidate);
  return candidate;
}

export async function importProductsFromCSV(csvData: string) {
  await verifyAdminSession();

  const parsed = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeCsvHeader,
  });

  const rows: { data: CsvProductRow; lineNo: number }[] = [];
  const errors: string[] = [];

  parsed.data.forEach((raw, idx) => {
    const lineNo = idx + 2; // +1 por la cabecera, +1 por índice base 0
    const validation = csvProductSchema.safeParse(raw);
    if (!validation.success) {
      const detail = validation.error.issues
        .map((i) => `${i.path.join('.') || 'fila'}: ${i.message}`)
        .join('; ');
      const label = (raw?.name ?? '').toString().trim().slice(0, 40) || 'sin nombre';
      errors.push(`Fila ${lineNo} («${label}»): ${detail}`);
      return;
    }
    rows.push({ data: validation.data, lineNo });
  });

  // Duplicados dentro del archivo → upsert ambiguo, se rechaza con detalle
  const seenSkus = new Map<string, number>();
  const seenNames = new Map<string, number>();
  for (const { data, lineNo } of rows) {
    if (data.sku) {
      const key = data.sku.toLowerCase();
      const prev = seenSkus.get(key);
      if (prev) errors.push(`Fila ${lineNo}: SKU «${data.sku}» duplicado en el archivo (ya aparece en la fila ${prev}).`);
      else seenSkus.set(key, lineNo);
    } else {
      const key = data.name.toLowerCase();
      const prev = seenNames.get(key);
      if (prev) errors.push(`Fila ${lineNo}: nombre «${data.name}» duplicado sin SKU (ya aparece en la fila ${prev}).`);
      else seenNames.set(key, lineNo);
    }
  }

  if (rows.length === 0) {
    errors.push('El archivo no contiene filas válidas. Cabeceras esperadas: sku, name, brand, category, price, stock, description, imageUrl.');
  }

  // PRD-155: con errores de validación no se toca la BD (todo-o-nada)
  if (errors.length > 0) {
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      errors,
      message: `Importación cancelada: ${errors.length} error(es) en el archivo. No se modificó ningún producto.`,
    };
  }

  // Resolución de coincidencias (solo lecturas, fuera de la transacción)
  const skus = rows.map((r) => r.data.sku).filter((s): s is string => !!s);
  const names = rows.map((r) => r.data.name);

  const [bySkuList, byNameList] = await Promise.all([
    skus.length
      ? prisma.product.findMany({
          where: { sku: { in: skus } },
          select: { id: true, sku: true, slug: true, name: true, stock: true, images: true },
        })
      : Promise.resolve([]),
    prisma.product.findMany({
      where: { name: { in: names } },
      select: { id: true, sku: true, slug: true, name: true, stock: true, images: true },
    }),
  ]);

  const bySku = new Map(bySkuList.map((p) => [p.sku!.toLowerCase(), p]));
  const byName = new Map<string, (typeof byNameList)[number]>();
  for (const p of byNameList) {
    const k = p.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, p);
  }

  type ImportPlan =
    | { kind: 'update'; id: string; previousStock: number; previousImage: string | null; data: CsvProductRow; slug: string }
    | { kind: 'create'; data: CsvProductRow; slug: string };

  const usedSlugs = new Set<string>();
  const plans: ImportPlan[] = [];

  for (const { data } of rows) {
    // SKU primero; nombre como fallback (incluye el caso «asignar SKU vía CSV»)
    const existing =
      (data.sku ? bySku.get(data.sku.toLowerCase()) : undefined) ??
      byName.get(data.name.toLowerCase());

    if (existing) {
      // El slug existente se conserva (estabilidad de URL); solo se genera si faltaba
      const slug = existing.slug || (await getUniqueSlugForImport(data.name, usedSlugs, existing.id));
      plans.push({
        kind: 'update',
        id: existing.id,
        previousStock: existing.stock,
        previousImage: existing.images[0] ?? null,
        data,
        slug,
      });
    } else {
      const slug = await getUniqueSlugForImport(data.name, usedSlugs);
      plans.push({ kind: 'create', data, slug });
    }
  }

  let createdCount = 0;
  let updatedCount = 0;

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const plan of plans) {
          const { name, price, stock, category, brand, description, sku, imageUrl } = plan.data;
          if (plan.kind === 'update') {
            await tx.product.update({
              where: { id: plan.id },
              data: {
                name, price, stock, category, brand, description,
                slug: plan.slug,
                ...(sku ? { sku } : {}),
                // La galería (images/media) no se toca en updates: se gestiona en el modal
              },
            });
            updatedCount++;
          } else {
            await tx.product.create({
              data: {
                name, price, stock, category, brand, description,
                sku: sku ?? null,
                slug: plan.slug,
                images: [imageUrl],
                media: {
                  create: [{ type: ProductMediaType.IMAGE, url: imageUrl, sortOrder: 0 }],
                },
              },
            });
            createdCount++;
          }
        }
      },
      { timeout: 60_000 },
    );
  } catch (dbError) {
    console.error('[importProductsFromCSV] transacción revertida:', dbError);
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      errors: [`Error de base de datos: ${(dbError as Error).message}`],
      message: 'Importación revertida por un error de base de datos. No se modificó ningún producto.',
    };
  }

  // Igual que quickUpdateStockAction: avisar a suscriptores si pasó de agotado a disponible
  for (const plan of plans) {
    if (plan.kind === 'update' && plan.previousStock === 0 && plan.data.stock > 0) {
      void triggerRestockNotifications(
        plan.id,
        plan.data.name,
        plan.slug,
        plan.previousImage,
        plan.data.price,
      );
    }
  }

  revalidatePath('/admin/products');
  revalidatePath('/');
  revalidateTag('catalog', 'default');
  revalidateTag('categories', 'default'); // category product counts in sidebar

  return {
    success: true,
    createdCount,
    updatedCount,
    errors: [],
    message: `Importación completada. Creados: ${createdCount} · Actualizados: ${updatedCount}.`,
  };
}

// ── Edición rápida desde la tabla de inventario ─────────────────────────────

export async function quickUpdateStockAction(productId: string, stock: number) {
  try {
    await verifyAdminSession();
    if (!Number.isInteger(stock) || stock < 0) {
      return { success: false, message: 'Stock debe ser un entero ≥ 0.' };
    }

    const current = await prisma.product.findUnique({
      where:  { id: productId },
      select: { stock: true, name: true, slug: true, images: true, price: true },
    });
    const previousStock = current?.stock ?? 0;

    await prisma.product.update({ where: { id: productId }, data: { stock } });

    // Notificar suscriptores si el producto pasó de agotado a disponible
    if (previousStock === 0 && stock > 0 && current) {
      void triggerRestockNotifications(
        productId,
        current.name,
        current.slug,
        current.images[0] ?? null,
        d(current.price),
      );
    }

    revalidatePath('/admin/products');
    revalidatePath('/');
    // PRD-024: sin esto, la ficha del producto y el catálogo (ISR) siguen
    // mostrando el stock anterior hasta 1 hora.
    revalidatePath(`/product/${current?.slug?.trim() || productId}`);
    revalidatePath('/productos');
    revalidateTag('catalog', 'default');
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No autorizado')) {
      return { success: false, message: 'No autorizado.' };
    }
    return { success: false, message: 'Error al actualizar stock.' };
  }
}

export async function quickUpdatePriceAction(productId: string, price: number) {
  try {
    await verifyAdminSession();
    if (typeof price !== 'number' || isNaN(price) || price < 0) {
      return { success: false, message: 'Precio inválido.' };
    }
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { price },
      select: { slug: true },
    });
    revalidatePath('/admin/products');
    revalidatePath('/');
    // PRD-024: invalidar la ficha y el catálogo para no vender al precio viejo
    // durante la ventana de ISR.
    revalidatePath(`/product/${updated.slug?.trim() || productId}`);
    revalidatePath('/productos');
    revalidateTag('catalog', 'default');
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No autorizado')) {
      return { success: false, message: 'No autorizado.' };
    }
    return { success: false, message: 'Error al actualizar precio.' };
  }
}

export async function getProductsAdmin(params: {
  search?:       string;
  category?:     string;
  minPrice?:     number;
  maxPrice?:     number;
  stockFilter?:  'all' | 'low' | 'out';
  lowThreshold?: number;
}) {
  // Las Server Actions son endpoints invocables directamente: la protección
  // del layout /admin NO aplica aquí. Sin este check, cualquiera podía
  // descargar el inventario completo (sku, specs, timestamps).
  await verifyAdminSession();

  const { search, category, minPrice, maxPrice, stockFilter = 'all', lowThreshold = 3 } = params;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name:  { contains: search, mode: 'insensitive' } },
      { sku:   { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }
  if (stockFilter === 'out')  where.stock = 0;
  if (stockFilter === 'low')  where.stock = { gt: 0, lte: lowThreshold };

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { media: { orderBy: { sortOrder: 'asc' } } },
  });

  const allCategories = await prisma.product
    .findMany({ distinct: ['category'], select: { category: true } })
    .then(res => res.map(p => p.category));

  return { products, categories: allCategories };
}
