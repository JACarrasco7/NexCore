const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const ROOT = process.cwd();
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const COOKIE_JAR = path.join(ROOT, 'scripts', 'cookies-mw.txt');
const EMAIL = 'test-mw@example.com';
const PASSWORD = 'Test1234!';

function run(cmd) {
  console.log('> ' + cmd);
  try {
    const out = execSync(cmd, { stdio: 'pipe' });
    const s = out.toString('utf8');
    console.log(s);
    return s;
  } catch (err) {
    console.error('Command failed:', err.message);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    throw err;
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    // 1) Ensure user exists with TOTP enabled
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    const secret = 'JBSWY3DPEHPK3PXP'; // example base32 secret
    await prisma.user.upsert({
      where: { email: EMAIL },
      create: { email: EMAIL, name: 'TOTP MW', passwordHash: hashedPassword, emailVerified: new Date(), totpEnabled: true, totpSecret: secret },
      update: { passwordHash: hashedPassword, totpEnabled: true, totpSecret: secret },
    });
    console.log('[mw-test] upserted user with TOTP enabled');

    // 2) Get CSRF token (stores cookies)
    run(`curl -s -c "${COOKIE_JAR}" -D "${path.join(ROOT,'scripts','csrf_mw_headers.txt')}" "${BASE}/api/auth/csrf" -o "${path.join(ROOT,'scripts','csrf_mw.json')}"`);
    const csrfJson = JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','csrf_mw.json'), 'utf8'));
    const csrf = csrfJson.csrfToken;
    console.log('[mw-test] csrfToken:', csrf);

    // 3) Sign in with credentials (store session cookie)
    const signinDataPath = path.join(ROOT, 'scripts', 'signin_mw_payload.txt');
    const form = `csrfToken=${encodeURIComponent(csrf)}&email=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`;
    fs.writeFileSync(signinDataPath, form, 'utf8');
    run(`curl -s -i -X POST -L -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" -H "Content-Type: application/x-www-form-urlencoded" --data-binary @"${signinDataPath}" "${BASE}/api/auth/callback/credentials" -o "${path.join(ROOT,'scripts','signin_mw_resp.txt')}"`);

    // 4) Request a protected page (should be redirected to /login?totp_required=1)
    run(`curl -s -i -b "${COOKIE_JAR}" "${BASE}/athlete" -o "${path.join(ROOT,'scripts','athlete_resp.txt')}" -D "${path.join(ROOT,'scripts','athlete_headers.txt')}"`);
    const headers = fs.readFileSync(path.join(ROOT,'scripts','athlete_headers.txt'), 'utf8');
    console.log('[mw-test] athlete response headers:\n', headers.split('\n').slice(0,30).join('\n'));

  } catch (err) {
    console.error('[mw-test] Error:', err);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
