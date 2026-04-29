'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Simulamos una base de datos de usuarios en localStorage
const FAKE_DB_KEY = 'mundotech_users';

interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Nunca guardamos contraseñas en texto plano
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Sincronizar nuestro estado de usuario con la sesión de NextAuth
    if (status === 'authenticated' && session?.user?.email) {
      const users: User[] = JSON.parse(localStorage.getItem(FAKE_DB_KEY) || '[]');
      const currentUser = users.find(u => u.email === session.user!.email);
      setUser(currentUser || null);
    } else {
      setUser(null);
    }
  }, [session, status]);

  const login = async (email: string, pass: string) => {
    const users: User[] = JSON.parse(localStorage.getItem(FAKE_DB_KEY) || '[]');
    const existingUser = users.find(u => u.email === email);

    if (!existingUser || existingUser.passwordHash !== `hashed_${pass}`) { // Simulación de hash
      return { success: false, message: 'Email o contraseña incorrectos.' };
    }

    const result = await signIn('credentials', { redirect: false, email, password: pass });
    if (result?.ok) {
      return { success: true, message: 'Login exitoso.' };
    }
    return { success: false, message: result?.error || 'Ocurrió un error inesperado.' };
  };

  const register = async (name: string, email: string, pass: string) => {
    const users: User[] = JSON.parse(localStorage.getItem(FAKE_DB_KEY) || '[]');
    if (users.some(u => u.email === email)) {
      return { success: false, message: 'Ya existe un usuario con este email.' };
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      passwordHash: `hashed_${pass}`, // Simulación de hash
    };

    users.push(newUser);
    localStorage.setItem(FAKE_DB_KEY, JSON.stringify(users));

    // Iniciar sesión automáticamente después del registro
    return login(email, pass);
  };

  const logout = () => {
    signOut({ callbackUrl: '/' });
  };

  const value = {
    user,
    loading: status === 'loading',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};