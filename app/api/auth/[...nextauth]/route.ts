import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const googleId     = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: AuthOptions = {
  providers: [
    ...(googleId && googleSecret
      ? [
          GoogleProvider({
            clientId:     googleId,
            clientSecret: googleSecret,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          role:  user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT;
      user?: { id?: string; role?: string; email?: string | null; name?: string | null } | null;
      account?: { provider?: string } | null;
    }) {
      if (user?.email && account?.provider === 'google') {
        const dbUser = await prisma.user.upsert({
          where:  { email: user.email },
          update: { name: user.name ?? undefined },
          create: {
            email:    user.email,
            name:     user.name ?? null,
            password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
            role:     'client',
          },
        });
        token.id   = dbUser.id;
        token.role = dbUser.role;
      } else if (user) {
        token.id   = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id   = (token.id   as string) ?? '';
        session.user.role = (token.role as string) ?? 'client';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
};

const nextAuthHandler = NextAuth(authOptions);

/**
 * Wrapper con rate limiting sobre el handler de NextAuth.
 * Limita intentos de login (POST) a 10 por IP por minuto para
 * mitigar ataques de fuerza bruta sobre CredentialsProvider.
 */
async function handler(req: Request, ctx: unknown) {
  if (req.method === 'POST') {
    const ip = getClientIp(req);
    if (rateLimit(`auth:${ip}`, { limit: 10, windowMs: 60_000 })) {
      return new Response(
        JSON.stringify({ error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en un minuto.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  return nextAuthHandler(req, ctx as Parameters<typeof nextAuthHandler>[1]);
}

export { handler as GET, handler as POST };
