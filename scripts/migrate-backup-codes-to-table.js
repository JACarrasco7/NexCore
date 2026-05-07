#!/usr/bin/env node
/*
  Script: Migrar backupCodes JSON -> tabla `backup_codes`.
  Uso local: `node scripts/migrate-backup-codes-to-table.js`
  Nota: requiere que la base de datos sea accesible con `DATABASE_URL`.
*/
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function hasTable() {
  const res = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'backup_codes'`;
  const row = Array.isArray(res) ? res[0] : res;
  const cnt = row?.cnt ?? row?.COUNT ?? Object.values(row || {})[0];
  return Number(cnt) > 0;
}

async function ensureTable() {
  const exists = await hasTable();
  if (exists) {
    console.log('backup_codes table already exists');
    return;
  }
  console.log('Creating backup_codes table...');
  // MySQL table creation
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS backup_codes (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      code_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Table created.');
}

async function migrate() {
  try {
    await ensureTable();
    const users = await prisma.user.findMany({ where: { backupCodes: { not: null } }, select: { id: true, backupCodes: true } });
    console.log('Found', users.length, 'users with legacy backupCodes');
    for (const u of users) {
      const v = u.backupCodes;
      let codes = null;
      if (Array.isArray(v)) codes = v;
      else if (typeof v === 'string') {
        try { codes = JSON.parse(v); } catch (e) { codes = null; }
      }
      if (!codes || !Array.isArray(codes) || codes.length === 0) continue;
      for (const h of codes) {
        const id = crypto.randomUUID();
        await prisma.$executeRaw`INSERT INTO backup_codes (id, user_id, code_hash, created_at) VALUES (${id}, ${u.id}, ${h}, NOW())`;
      }
      await prisma.user.update({ where: { id: u.id }, data: { backupCodes: null } });
      console.log('Migrated', codes.length, 'codes for user', u.id);
    }
    console.log('Migration finished');
  } catch (e) {
    console.error('Migration failed', e);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
