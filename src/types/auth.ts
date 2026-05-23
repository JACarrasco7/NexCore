import { JWT } from 'next-auth/jwt'
import { Session } from 'next-auth'
import { User } from 'next-auth'

/**
 * Extended JWT token with application-specific claims
 */
export interface AppJWT extends JWT {
  id: string
  role: 'ATHLETE' | 'COACH' | 'ADMIN'
  totpEnabled: boolean
  totpVerified: boolean
  emailVerified: boolean
  phoneVerified: boolean
  verificationMethod?: 'EMAIL' | 'SMS' | 'BOTH'
  iat: number
  totpCheckedAt?: number
}

/**
 * Extended Session user with application-specific fields
 * Note: Fields are optional during initial auth and populated by jwt callback
 */
export interface AppUser extends User {
  id: string
  role?: 'ATHLETE' | 'COACH' | 'ADMIN'
  totpEnabled?: boolean
  totpVerified?: boolean
  emailVerified?: boolean
  phoneVerified?: boolean
  verificationMethod?: 'EMAIL' | 'SMS' | 'BOTH'
}

/**
 * Extended Session with application-specific user type
 */
export interface AppSession extends Session {
  user: AppUser
}

/**
 * Update session payload for unstable_update
 */
export interface UpdateSessionPayload {
  user?: {
    totpVerified?: boolean
    totpEnabled?: boolean
    [key: string]: boolean | string | undefined
  }
}
