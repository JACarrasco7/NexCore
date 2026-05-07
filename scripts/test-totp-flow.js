const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx);
    let val = trimmed.slice(idx + 1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  });
}

loadDotEnv();

const { PrismaClient } = require('@prisma/client');
const otplib = require('otplib');
const authenticator = otplib.authenticator || (otplib.default && otplib.default.authenticator) || otplib;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function main() {
  const prisma = new PrismaClient();
  const email = 'test-totp+ci@example.com';
  try {
    console.log('[test] Upserting test user:', email);
    const hashedPassword = await bcrypt.hash('Test1234!', 10);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name: 'TOTP CI', passwordHash: hashedPassword, emailVerified: new Date() },
      update: { passwordHash: hashedPassword, totpSecret: null, totpEnabled: false, backupCodes: null, pendingTotpSecret: null, pendingTotpExpiresAt: null },
    });

    console.log('[test] User id:', user.id);

    // generate secret and store as pending (mimic /api/2fa/setup)
    const secret = authenticator.generateSecret ? authenticator.generateSecret() : (require('crypto').randomBytes(10).toString('hex').toUpperCase());
    let otpauth = '';
    if (typeof authenticator.keyuri === 'function') {
      otpauth = authenticator.keyuri(email, 'Apex Coach OS', secret);
    } else {
      otpauth = `otpauth://totp/${encodeURIComponent(email)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent('Apex Coach OS')}`;
    }
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { pendingTotpSecret: secret, pendingTotpExpiresAt: expiresAt } });
    console.log('[test] Stored pendingTotpSecret, otpauth:', otpauth);

    // debug shapes
    try {
      console.log('[debug] otplib keys:', Object.keys(otplib));
      console.log('[debug] authenticator keys:', authenticator ? Object.keys(authenticator) : 'no-authenticator');
    } catch (e) {
      console.warn('[debug] cannot inspect otplib shape', e);
    }

    // generate current token (handle sync/async shapes)
    async function generateToken(s) {
      const attempts = [
        () => authenticator && authenticator.generate && authenticator.generate(s),
        () => authenticator && authenticator.generate && authenticator.generate({ secret: s }),
        () => authenticator && authenticator.generateSync && authenticator.generateSync(s),
        () => otplib && otplib.generate && otplib.generate(s),
        () => otplib && otplib.generate && otplib.generate({ secret: s }),
        () => otplib && otplib.totp && otplib.totp.generate && otplib.totp.generate(s),
        () => otplib && otplib.totp && otplib.totp.generate && otplib.totp.generate({ secret: s }),
      ];
      let lastErr = null;
      for (const fn of attempts) {
        try {
          const r = fn();
          if (r === undefined) continue;
          if (r && typeof r.then === 'function') return await r;
          return r;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('No generate() available from otplib');
    }

    async function verifyToken(s, t) {
      const attempts = [
        () => authenticator && authenticator.check && authenticator.check(t, s),
        () => authenticator && authenticator.verify && authenticator.verify(t, s),
        () => authenticator && authenticator.verifySync && authenticator.verifySync(t, s),
        () => otplib && otplib.verify && otplib.verify(t, s),
        () => otplib && otplib.verify && otplib.verify({ token: t, secret: s }),
        () => otplib && otplib.totp && otplib.totp.check && otplib.totp.check(t, s),
        () => otplib && otplib.totp && otplib.totp.verify && otplib.totp.verify(t, s),
      ];
      let lastErr = null;
      for (const fn of attempts) {
        try {
          const r = fn();
          if (r === undefined) continue;
          if (r && typeof r.then === 'function') return await r;
          return r;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('No verify() available from otplib');
    }

    const token = await generateToken(secret);
    console.log('[test] Generated token from secret:', token);

    // mimic enable endpoint logic: verify pending secret and promote
    const ok = await verifyToken(secret, token);
    console.log('[test] Verification ok?', ok);
    if (!ok) throw new Error('Token verification failed');

    // generate backup codes
    const plain = [];
    const hashed = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(Math.ceil(8 / 2)).toString('hex').slice(0, 8).toUpperCase();
      plain.push(code);
      hashed.push(await bcrypt.hash(code, 10));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret, totpEnabled: true, backupCodes: hashed, pendingTotpSecret: null, pendingTotpExpiresAt: null },
    });

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    console.log('[test] After enable — totpEnabled:', updated.totpEnabled ? 'true' : 'false');

    // Validate using current token against stored secret (use helper)
    const validateOk = await verifyToken(updated.totpSecret, token);
    console.log('[test] Validate with current token — ok?', validateOk);

    // Validate a backup code
    const firstPlain = plain[0];
    const firstHashed = updated.backupCodes && updated.backupCodes[0];
    const bcMatch = await bcrypt.compare(firstPlain, firstHashed);
    console.log('[test] Backup code matches hashed[0]?', bcMatch);

    console.log('[test] Plain backup codes (showing to operator):', plain.join(', '));

    console.log('[test] TOTP flow simulation completed successfully');
  } catch (err) {
    console.error('[test] Error during TOTP flow test:', err);
    process.exitCode = 2;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {}
  }
}

main();
