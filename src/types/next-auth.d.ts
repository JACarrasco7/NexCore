import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role?: string
    totpEnabled?: boolean
    totpVerified?: boolean
  }

  interface Session {
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    totpEnabled?: boolean
    totpVerified?: boolean
    totpCheckedAt?: number
  }
}
