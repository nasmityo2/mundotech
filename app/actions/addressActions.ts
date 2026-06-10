'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { SavedAddress, SavedAddressInput } from '@/lib/definitions';

interface ActionResult {
  success: boolean;
  message: string;
}

function toSavedAddress(row: {
  id: string;
  userId: string;
  alias: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phoneNumber: string;
  shippingMethod: string;
  mrwState: string | null;
  mrwOffice: string | null;
  isDefault: boolean;
  createdAt: Date;
}): SavedAddress {
  return {
    id:             row.id,
    userId:         row.userId,
    alias:          row.alias,
    firstName:      row.firstName,
    lastName:       row.lastName,
    idNumber:       row.idNumber,
    phoneNumber:    row.phoneNumber,
    shippingMethod: row.shippingMethod as 'tienda' | 'mrw',
    mrwState:       row.mrwState,
    mrwOffice:      row.mrwOffice,
    isDefault:      row.isDefault,
    createdAt:      row.createdAt.toISOString(),
  };
}

export async function getSavedAddresses(): Promise<SavedAddress[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  try {
    const rows = await prisma.savedAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toSavedAddress);
  } catch (error) {
    console.error('[addressActions] getSavedAddresses:', error);
    return [];
  }
}

export async function createSavedAddress(
  data: SavedAddressInput,
): Promise<ActionResult & { address?: SavedAddress }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, message: 'No autorizado.' };
  }

  const userId = session.user.id;

  if (!data.alias?.trim()) return { success: false, message: 'El alias es requerido.' };
  if (!data.firstName?.trim()) return { success: false, message: 'El nombre es requerido.' };
  if (!data.lastName?.trim()) return { success: false, message: 'El apellido es requerido.' };
  if (!data.idNumber?.trim()) return { success: false, message: 'La cédula es requerida.' };
  if (!data.phoneNumber?.trim()) return { success: false, message: 'El teléfono es requerido.' };
  if (data.shippingMethod === 'mrw' && !data.mrwState?.trim()) {
    return { success: false, message: 'Selecciona un estado para MRW.' };
  }
  if (data.shippingMethod === 'mrw' && !data.mrwOffice?.trim()) {
    return { success: false, message: 'Selecciona una oficina MRW.' };
  }

  try {
    const count = await prisma.savedAddress.count({ where: { userId } });
    const isFirst = count === 0;
    const makeDefault = data.isDefault || isFirst;

    if (makeDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const created = await prisma.savedAddress.create({
      data: {
        userId,
        alias:          data.alias.trim(),
        firstName:      data.firstName.trim(),
        lastName:       data.lastName.trim(),
        idNumber:       data.idNumber.trim(),
        phoneNumber:    data.phoneNumber.trim(),
        shippingMethod: data.shippingMethod,
        mrwState:       data.shippingMethod === 'mrw' ? (data.mrwState?.trim() ?? null) : null,
        mrwOffice:      data.shippingMethod === 'mrw' ? (data.mrwOffice?.trim() ?? null) : null,
        isDefault:      makeDefault,
      },
    });

    revalidatePath('/account/addresses');
    return { success: true, message: 'Dirección guardada.', address: toSavedAddress(created) };
  } catch (error) {
    console.error('[addressActions] createSavedAddress:', error);
    return { success: false, message: 'Error al guardar la dirección.' };
  }
}

export async function updateSavedAddress(
  id: string,
  data: SavedAddressInput,
): Promise<ActionResult & { address?: SavedAddress }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, message: 'No autorizado.' };

  const userId = session.user.id;

  if (!data.alias?.trim()) return { success: false, message: 'El alias es requerido.' };
  if (!data.firstName?.trim()) return { success: false, message: 'El nombre es requerido.' };
  if (!data.lastName?.trim()) return { success: false, message: 'El apellido es requerido.' };
  if (!data.idNumber?.trim()) return { success: false, message: 'La cédula es requerida.' };
  if (!data.phoneNumber?.trim()) return { success: false, message: 'El teléfono es requerido.' };
  if (data.shippingMethod === 'mrw' && !data.mrwState?.trim()) {
    return { success: false, message: 'Selecciona un estado para MRW.' };
  }
  if (data.shippingMethod === 'mrw' && !data.mrwOffice?.trim()) {
    return { success: false, message: 'Selecciona una oficina MRW.' };
  }

  try {
    const existing = await prisma.savedAddress.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return { success: false, message: 'Dirección no encontrada.' };
    }

    if (data.isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.savedAddress.update({
      where: { id },
      data: {
        alias:          data.alias.trim(),
        firstName:      data.firstName.trim(),
        lastName:       data.lastName.trim(),
        idNumber:       data.idNumber.trim(),
        phoneNumber:    data.phoneNumber.trim(),
        shippingMethod: data.shippingMethod,
        mrwState:       data.shippingMethod === 'mrw' ? (data.mrwState?.trim() ?? null) : null,
        mrwOffice:      data.shippingMethod === 'mrw' ? (data.mrwOffice?.trim() ?? null) : null,
        isDefault:      data.isDefault ?? existing.isDefault,
      },
    });

    revalidatePath('/account/addresses');
    return { success: true, message: 'Dirección actualizada.', address: toSavedAddress(updated) };
  } catch (error) {
    console.error('[addressActions] updateSavedAddress:', error);
    return { success: false, message: 'Error al actualizar la dirección.' };
  }
}

export async function deleteSavedAddress(id: string): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, message: 'No autorizado.' };

  const userId = session.user.id;

  try {
    const existing = await prisma.savedAddress.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return { success: false, message: 'Dirección no encontrada.' };
    }

    await prisma.savedAddress.delete({ where: { id } });

    if (existing.isDefault) {
      const next = await prisma.savedAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await prisma.savedAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    revalidatePath('/account/addresses');
    return { success: true, message: 'Dirección eliminada.' };
  } catch (error) {
    console.error('[addressActions] deleteSavedAddress:', error);
    return { success: false, message: 'Error al eliminar la dirección.' };
  }
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, message: 'No autorizado.' };

  const userId = session.user.id;

  try {
    const existing = await prisma.savedAddress.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return { success: false, message: 'Dirección no encontrada.' };
    }

    await prisma.savedAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    await prisma.savedAddress.update({ where: { id }, data: { isDefault: true } });

    revalidatePath('/account/addresses');
    return { success: true, message: 'Dirección predeterminada actualizada.' };
  } catch (error) {
    console.error('[addressActions] setDefaultAddress:', error);
    return { success: false, message: 'Error al actualizar la dirección predeterminada.' };
  }
}
