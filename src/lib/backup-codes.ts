import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

async function hasBackupCodesTable(): Promise<boolean> {
  try {
    const res: any =
      await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'backup_codes'`
    const row = Array.isArray(res) ? res[0] : res
    const cnt = row?.cnt ?? row?.COUNT ?? Object.values(row || {})[0]
    return Number(cnt) > 0
  } catch (e) {
    return false
  }
}

export async function getBackupCodesForUser(userId: string): Promise<string[] | null> {
  const table = await hasBackupCodesTable()
  if (table) {
    try {
      const rows: any =
        await prisma.$queryRaw`SELECT code_hash FROM backup_codes WHERE user_id = ${userId} ORDER BY created_at ASC`
      if (!rows) return null
      return (Array.isArray(rows) ? rows.map((r: any) => r.code_hash) : []).filter(Boolean)
    } catch (e) {
      return null
    }
  }

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { backupCodes: true } })
  if (!u) return null
  const v = u.backupCodes as any
  if (!v) return null
  if (Array.isArray(v)) return v as string[]
  try {
    if (typeof v === 'string') return JSON.parse(v) as string[]
  } catch (e) {
    return null
  }
  return null
}

export async function setBackupCodesForUser(userId: string, hashed: string[] | null) {
  const table = await hasBackupCodesTable()
  if (table) {
    await prisma.$executeRaw`DELETE FROM backup_codes WHERE user_id = ${userId}`
    if (!hashed || !Array.isArray(hashed) || hashed.length === 0) return
    for (const h of hashed) {
      const id = crypto.randomUUID()
      await prisma.$executeRaw`INSERT INTO backup_codes (id, user_id, code_hash, created_at) VALUES (${id}, ${userId}, ${h}, NOW())`
    }
    return
  }

  return prisma.user.update({ where: { id: userId }, data: { backupCodes: hashed ?? undefined } })
}

export async function removeBackupCodeAtIndex(userId: string, index: number) {
  const table = await hasBackupCodesTable()
  if (table) {
    const rows: any =
      await prisma.$queryRaw`SELECT id FROM backup_codes WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1 OFFSET ${index}`
    const row = Array.isArray(rows) ? rows[0] : rows
    if (!row || !row.id) return
    await prisma.$executeRaw`DELETE FROM backup_codes WHERE id = ${row.id}`
    return
  }

  const current = await getBackupCodesForUser(userId)
  if (!current) return
  const next = [...current]
  next.splice(index, 1)
  await setBackupCodesForUser(userId, next)
}
