'use server';

import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/resend';
import bcrypt from 'bcrypt';

function firstNameFromName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return 'Cliente';
  return t.split(/\s+/)[0] ?? t;
}

export async function registerUserAction({ name, email, password }: Record<string, string>) {
  try {
    // 1. Validar que los datos no estén vacíos
    if (!name || !email || !password) {
      return { success: false, message: 'Todos los campos son obligatorios.' };
    }

    // 2. Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, message: 'El correo electrónico ya está en uso.' };
    }

    // 3. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Crear el usuario (el rol por defecto es CLIENT)
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'client', // Asignación explícita del rol
      },
    });

    // Correo de bienvenida (fallos no revierten el registro; se registran en logs)
    await sendWelcomeEmail(email, firstNameFromName(name));

    return { success: true, message: '¡Usuario registrado con éxito!' };

  } catch (error) {
    console.error('Error en registerUserAction:', error);
    return { success: false, message: 'Ocurrió un error inesperado en el servidor.' };
  }
}
