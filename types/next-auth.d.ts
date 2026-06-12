import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id:    string;
      role:  string;
    } & DefaultSession['user'];
  }

  interface User {
    id:    string;
    role?: string;
    /** Huella corta del hash de contraseña — invalida sesiones al cambiarla. */
    pwv?:  string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?:    string;
    role?:  string;
    /** Huella corta del hash de contraseña vigente (PRD-173/240). */
    pwv?:   string;
    /** Epoch ms de la última re-validación del JWT contra BD. */
    pwvAt?: number;
  }
}
