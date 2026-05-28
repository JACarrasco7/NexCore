import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { AppJWT, AppSession, UpdateSessionPayload } from '@/types/auth'

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
            emailVerified: true,
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
        const nsUser = newSession.user as UpdateSessionPayload['user']
        if (typeof nsUser?.totpVerified !== 'undefined')
          token.totpVerified = Boolean(nsUser.totpVerified)
        if (typeof nsUser?.totpEnabled !== 'undefined')
          token.totpEnabled = Boolean(nsUser.totpEnabled)
        ;(token as AppJWT).totpCheckedAt = Math.floor(Date.now() / 1000)
        return token
      }
      if (user) {
        // New login
        const appToken = token as AppJWT
        appToken.role = ((user as any)?.role as 'ATHLETE' | 'COACH' | 'ADMIN') || 'ATHLETE'
        appToken.id = (user as any)?.id || ''
        appToken.emailVerified = Boolean((user as any)?.emailVerified as Date | null | undefined)
        // expose if user has TOTP enabled; mark verified=false so client can require second step
        appToken.totpEnabled = (user as { totpEnabled?: boolean }).totpEnabled ?? false
        appToken.totpVerified = appToken.totpEnabled ? false : true
        appToken.iat = Math.floor(Date.now() / 1000)
        appToken.totpCheckedAt = Math.floor(Date.now() / 1000)

        // Cargar datos de verificación según rol
        const isEdge =
          typeof process !== 'undefined' && process.env && process.env.NEXT_RUNTIME === 'edge'
        if (!isEdge) {
          if (appToken.role === 'COACH') {
            const coach = await prisma.coach.findUnique({
              where: { userId: user.id },
              select: { phoneVerified: true },
            })
            appToken.phoneVerified = coach?.phoneVerified ?? false
          } else if (appToken.role === 'ATHLETE') {
            const athlete = await prisma.athlete.findUnique({
              where: { userId: user.id },
              select: { phoneVerified: true, verificationMethod: true },
            })
            appToken.phoneVerified = athlete?.phoneVerified ?? false
            appToken.verificationMethod =
              (athlete?.verificationMethod as 'EMAIL' | 'SMS' | 'BOTH' | undefined) ?? 'EMAIL'
          }
        }
      } else if (token.iat) {
        const appToken = token as AppJWT
        const now = Math.floor(Date.now() / 1000)
        const age = now - (appToken.iat as number)
        // Refresh iat every 7 days to keep long lived tokens rotated
        if (age > 7 * 24 * 60 * 60) {
          appToken.iat = now
        }

        // Refresh `totpEnabled` from DB at most once per 10s to reflect recent changes
        const lastChecked = appToken.totpCheckedAt as number | undefined
        try {
          if (!lastChecked || now - lastChecked > 10) {
            // Avoid calling Prisma from edge runtime where Prisma Client isn't supported.
            // The jwt callback can be executed in various runtimes; skip DB refresh when
            // running under Next.js Edge runtime.
            const isEdge =
              typeof process !== 'undefined' && process.env && process.env.NEXT_RUNTIME === 'edge'
            if (!isEdge) {
              const fresh = await prisma.user.findUnique({
                where: { id: appToken.id as string },
                select: { totpEnabled: true, emailVerified: true },
              })
              if (fresh) {
                appToken.totpEnabled = Boolean(fresh.totpEnabled)
                appToken.emailVerified = Boolean(fresh.emailVerified)
                // If TOTP was disabled in DB, mark verified=true. If enabled, preserve existing token.totpVerified
                if (!appToken.totpEnabled) {
                  appToken.totpVerified = true
                }
              }

              // Refrescar datos de verificación según rol
              const role = appToken.role as string
              if (role === 'COACH') {
                const coach = await prisma.coach.findUnique({
                  where: { userId: appToken.id as string },
                  select: { phoneVerified: true },
                })
                appToken.phoneVerified = coach?.phoneVerified ?? false
              } else if (role === 'ATHLETE') {
                const athlete = await prisma.athlete.findUnique({
                  where: { userId: appToken.id as string },
                  select: { phoneVerified: true, verificationMethod: true },
                })
                appToken.phoneVerified = athlete?.phoneVerified ?? false
                appToken.verificationMethod =
                  (athlete?.verificationMethod as 'EMAIL' | 'SMS' | 'BOTH' | undefined) ?? 'EMAIL'
              }
            }
            appToken.totpCheckedAt = now
          }
        } catch (err) {
          console.warn('[auth] jwt refresh error', err)
        }
      }
      return token
    },
    session({ session, token }) {
      const appSession = session as AppSession
      const appToken = token as AppJWT
      if (appSession.user) {
        appSession.user.id = appToken.id
        appSession.user.role = appToken.role
        appSession.user.totpEnabled = Boolean(appToken.totpEnabled)
        appSession.user.totpVerified = Boolean(appToken.totpVerified)
        appSession.user.emailVerified = Boolean(appToken.emailVerified)
        appSession.user.phoneVerified = Boolean(appToken.phoneVerified)
        appSession.user.verificationMethod =
          (appToken.verificationMethod as 'EMAIL' | 'SMS' | 'BOTH' | undefined) ?? 'EMAIL'
      }
      return appSession
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
