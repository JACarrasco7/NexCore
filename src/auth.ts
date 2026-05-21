import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn('[Auth] Credenciales incompletas')
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            totpEnabled: true,
          },
        })

        if (!user?.passwordHash) {
          console.warn(`[Auth] Usuario no encontrado o sin contraseña: ${credentials.email}`)
          return null
        }

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)

        if (!valid) {
          console.warn(`[Auth] Contraseña inválida para: ${credentials.email}`)
          return null
        }

        console.log(`[Auth] Login exitoso: ${user.email} (${user.role})`)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          totpEnabled: user.totpEnabled,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 horas (más seguro que 30 días)
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 horas
  },
  callbacks: {
    jwt: async ({ token, user, session: newSession, trigger }) => {
      // If this callback is invoked as part of an `unstable_update` (trigger === 'update'),
      // merge any provided `newSession.user` fields into the token so they appear in the re-signed cookie.
      if (trigger === 'update' && newSession?.user) {
        const nsUser: any = newSession.user
        if (typeof nsUser.totpVerified !== 'undefined')
          token.totpVerified = Boolean(nsUser.totpVerified)
        if (typeof nsUser.totpEnabled !== 'undefined')
          token.totpEnabled = Boolean(nsUser.totpEnabled)
        ;(token as any).totpCheckedAt = Math.floor(Date.now() / 1000)
        return token
      }
      if (user) {
        // New login
        token.role = (user as { role?: string }).role || 'ATHLETE'
        token.id = user.id
        token.emailVerified = Boolean((user as { emailVerified?: Date | null }).emailVerified)
        // expose if user has TOTP enabled; mark verified=false so client can require second step
        token.totpEnabled = (user as { totpEnabled?: boolean }).totpEnabled ?? false
        token.totpVerified = token.totpEnabled ? false : true
        token.iat = Math.floor(Date.now() / 1000)
        ;(token as any).totpCheckedAt = Math.floor(Date.now() / 1000)

        // Cargar datos de verificación según rol
        const isEdge =
          typeof process !== 'undefined' && process.env && process.env.NEXT_RUNTIME === 'edge'
        if (!isEdge) {
          if (token.role === 'COACH') {
            const coach = await prisma.coach.findUnique({
              where: { userId: user.id },
              select: { phoneVerified: true },
            })
            token.phoneVerified = coach?.phoneVerified ?? false
          } else if (token.role === 'ATHLETE') {
            const athlete = await prisma.athlete.findUnique({
              where: { userId: user.id },
              select: { phoneVerified: true, verificationMethod: true },
            })
            token.phoneVerified = athlete?.phoneVerified ?? false
            token.verificationMethod = athlete?.verificationMethod ?? 'EMAIL'
          }
        }
      } else if (token.iat) {
        const now = Math.floor(Date.now() / 1000)
        const age = now - (token.iat as number)
        // Refresh iat every 7 days to keep long lived tokens rotated
        if (age > 7 * 24 * 60 * 60) {
          token.iat = now
        }

        // Refresh `totpEnabled` from DB at most once per 10s to reflect recent changes
        const lastChecked = (token as any).totpCheckedAt as number | undefined
        try {
          if (!lastChecked || now - lastChecked > 10) {
            // Avoid calling Prisma from edge runtime where Prisma Client isn't supported.
            // The jwt callback can be executed in various runtimes; skip DB refresh when
            // running under Next.js Edge runtime.
            const isEdge =
              typeof process !== 'undefined' && process.env && process.env.NEXT_RUNTIME === 'edge'
            if (!isEdge) {
              const fresh = await prisma.user.findUnique({
                where: { id: token.id as string },
                select: { totpEnabled: true, emailVerified: true },
              })
              if (fresh) {
                token.totpEnabled = Boolean(fresh.totpEnabled)
                token.emailVerified = Boolean(fresh.emailVerified)
                // If TOTP was disabled in DB, mark verified=true. If enabled, preserve existing token.totpVerified
                if (!token.totpEnabled) {
                  token.totpVerified = true
                }
              }

              // Refrescar datos de verificación según rol
              const role = token.role as string
              if (role === 'COACH') {
                const coach = await prisma.coach.findUnique({
                  where: { userId: token.id as string },
                  select: { phoneVerified: true },
                })
                token.phoneVerified = coach?.phoneVerified ?? false
              } else if (role === 'ATHLETE') {
                const athlete = await prisma.athlete.findUnique({
                  where: { userId: token.id as string },
                  select: { phoneVerified: true, verificationMethod: true },
                })
                token.phoneVerified = athlete?.phoneVerified ?? false
                token.verificationMethod = athlete?.verificationMethod ?? 'EMAIL'
              }
            }
            ;(token as any).totpCheckedAt = now
          }
        } catch (err) {
          console.warn('[auth] jwt refresh error', err)
        }
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).totpEnabled = Boolean(token.totpEnabled)
        ;(session.user as any).totpVerified = Boolean(token.totpVerified)
        ;(session.user as any).emailVerified = Boolean(token.emailVerified)
        ;(session.user as any).phoneVerified = Boolean(token.phoneVerified)
        ;(session.user as any).verificationMethod = (token.verificationMethod as string) || 'EMAIL'
      }
      return session
    },
    authorized({ request, auth: sess }) {
      // Permitir acceso si tiene sesión
      return !!sess
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
})
