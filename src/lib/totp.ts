import * as otplib from 'otplib'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

interface Authenticator {
  generateSecret(): string
  check(token: string, secret: string): boolean
  keyuri?(account: string, issuer: string, secret: string): string
  options?: { window?: number }
}

const authenticator: Authenticator =
  (otplib as unknown as { authenticator?: Authenticator }).authenticator ||
  (otplib as unknown as { default?: { authenticator?: Authenticator } }).default?.authenticator ||
  (otplib as unknown as Authenticator)

// try to set a small verification window; ignore if object is non-extensible
try {
  try {
    ;(authenticator as any).options = { window: 1 }
  } catch (_e) {
    // some bundlers/export shapes provide a frozen object — skip in that case
  }
} catch (_e) {
  // ignore
}

export function generateSecret(email: string, issuer = 'NEXUM') {
  const secret = authenticator.generateSecret()
  // Some export shapes of otplib may not expose `keyuri`; build otpauth URI manually
  const account = encodeURIComponent(email || 'user')
  const issuerEnc = encodeURIComponent(issuer)
  const otpauth = `otpauth://totp/${issuerEnc}:${account}?secret=${secret}&issuer=${issuerEnc}&algorithm=SHA1&digits=6&period=30`
  return { secret, otpauth }
}

export function verifyToken(secret: string, token: string) {
  try {
    if (!secret || !token) return false
    // base32 decode
    const clean = String(secret).replace(/\s+/g, '').replace(/=+$/, '').toUpperCase()
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    const bytes: number[] = []
    let bits = 0
    let value = 0
    for (let i = 0; i < clean.length; i++) {
      const idx = alphabet.indexOf(clean[i])
      if (idx === -1) continue
      value = (value << 5) | idx
      bits += 5
      if (bits >= 8) {
        bits -= 8
        bytes.push((value >> bits) & 0xff)
      }
    }
    const secretBytes = Buffer.from(bytes)

    const digits = 6
    const period = 30
    const now = Math.floor(Date.now() / 1000 / period)
    for (let offset = -1; offset <= 1; offset++) {
      const counter = BigInt(now + offset)
      const buf = Buffer.alloc(8)
      buf.writeBigUInt64BE(counter)
      const hmac = crypto.createHmac('sha1', secretBytes).update(buf).digest()
      const off = hmac[hmac.length - 1] & 0xf
      const code =
        ((hmac[off] & 0x7f) << 24) |
        ((hmac[off + 1] & 0xff) << 16) |
        ((hmac[off + 2] & 0xff) << 8) |
        (hmac[off + 3] & 0xff)
      const otp = (code % 10 ** digits).toString().padStart(digits, '0')
      if (otp === String(token).padStart(digits, '0')) return true
    }
    return false
  } catch (err) {
    console.debug('[totp] verifyToken error', (err as Error)?.message || err)
    return false
  }
}

export async function generateBackupCodes(count = 8, length = 8) {
  const plain: string[] = []
  const hashed: string[] = []
  for (let i = 0; i < count; i++) {
    const code = crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase()
    plain.push(code)
    const h = await bcrypt.hash(code, 10)
    hashed.push(h)
  }
  return { plain, hashed }
}

export async function verifyBackupCode(hashedCodes: string[] | null | undefined, code: string) {
  if (!hashedCodes || !Array.isArray(hashedCodes)) return { ok: false, index: -1 }
  for (let i = 0; i < hashedCodes.length; i++) {
    const h = hashedCodes[i]
    if (!h) continue

    const match = await bcrypt.compare(code, h).catch(() => false)
    if (match) return { ok: true, index: i }
  }
  return { ok: false, index: -1 }
}
