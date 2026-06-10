'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/api-auth';
import { z } from 'zod';
import Papa from 'papaparse';
import { slugify } from '@/lib/slugify';
import { Prisma, ProductMediaType } from '@prisma/client';
import { deriveLegacyImagesFromSlots } from '@/lib/product-media';
import { triggerRestockNotifications } from '@/app/actions/restockActions';
import { parseProductSpecs } from '@/lib/definitions';

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

    revalidatePath('/admin/products');
    revalidatePath('/');
    revalidatePath(`/product/${slug}`);
    return { success: true, message: 'Producto actualizado con éxito.' };
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    if (error instanceof Error && error.message.startsWith('No autorizado')) {
      return { success: false, message: 'No tienes permiso para realizar esta acción.' };
    }
    return { success: false, message: 'No se pudo actualizar el producto.' };
  }
}

export async function deleteProductAction(productId: string) {
  try {
    await verifyAdminSession();
    await prisma.product.delete({ where: { id: productId } });
    revalidatePath('/admin/products');
    revalidatePath('/');
    return { success: true, message: 'Producto eliminado con éxito.' };
  } catch (error) {
    console.error('Error al eliminar el producto:', error);
    if (error instanceof Error && error.message.startsWith('No autorizado')) {
      return { success: false, message: 'No tienes permiso para realizar esta acción.' };
    }
    return { success: false, message: 'No se pudo eliminar el producto.' };
  }
}

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
  });

  const categories = await prisma.product
    .findMany({ distinct: ['category'], select: { category: true } })
    .then(res => res.map(p => p.category));

  return { products, categories };
}

// ── CSV Import ──────────────────────────────────────────────────────────────

const csvProductSchema = z.object({
  name:        z.string().min(1),
  price:       z.coerce.number().positive(),
  stock:       z.coerce.number().int().nonnegative(),
  category:    z.string().optional().default('General'),
  brand:       z.string().optional().default('Sin Marca'),
  description: z.string().optional().default('Sin descripción'),
  imageUrl:    z.string().url().optional().default('/placeholder-product.png'),
});

export async function importProductsFromCSV(csvData: string) {
  await verifyAdminSession();

  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

  let createdCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  for (const row of parsed.data) {
    const validation = csvProductSchema.safeParse(row);
    if (!validation.success) {
      errors.push(`Fila inválida: ${JSON.stringify(row)} - Error: ${validation.error.message}`);
      continue;
    }

    const { name, price, stock, category, brand, description, imageUrl } = validation.data;

    try {
      // Buscar producto existente por nombre para el upsert
      const existing = await prisma.product.findFirst({ where: { name }, select: { id: true, slug: true } });
      const slug = existing?.slug || await getUniqueSlug(name, existing?.id);

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data:  { price, stock, slug },
        });
        updatedCount++;
      } else {
        await prisma.product.create({
          data: {
            name,
            price,
            stock,
            category: category!,
            brand: brand!,
            description: description!,
            images: [imageUrl!],
            slug,
            media: {
              create: [
                {
                  type: ProductMediaType.IMAGE,
                  url: imageUrl!,
                  sortOrder: 0,
                },
              ],
            },
          },
        });
        createdCount++;
      }
    } catch (dbError) {
      errors.push(`Error en base de datos para ${name}: ${(dbError as Error).message}`);
    }
  }

  revalidatePath('/admin/products');
  revalidatePath('/');

  return {
    success: errors.length === 0,
    createdCount,
    updatedCount,
    errors,
    message: `Importación completada. Creados: ${createdCount}, Actualizados: ${updatedCount}. Errores: ${errors.length}`,
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
        current.price,
      );
    }

    revalidatePath('/admin/products');
    revalidatePath('/');
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
    await prisma.product.update({ where: { id: productId }, data: { price } });
    revalidatePath('/admin/products');
    revalidatePath('/');
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
