const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const otplib = require('otplib');
const authenticator = otplib.authenticator || (otplib.default && otplib.default.authenticator) || otplib;

const ROOT = process.cwd();
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const COOKIE_JAR = path.join(ROOT, 'scripts', 'cookies.txt');
const EMAIL = 'test-totp+ci@example.com';
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
    // 1) Get CSRF token (stores cookies)
    run(`curl -s -c "${COOKIE_JAR}" -D "${path.join(ROOT,'scripts','csrf_headers.txt')}" "${BASE}/api/auth/csrf" -o "${path.join(ROOT,'scripts','csrf.json')}"`);
    const csrfJson = JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','csrf.json'), 'utf8'));
    const csrf = csrfJson.csrfToken;
    console.log('[test-http] csrfToken:', csrf);

    // 2) Sign in with credentials (store session cookie)
    const signinDataPath = path.join(ROOT, 'scripts', 'signin_payload.txt');
    // Build form-encoded payload
    const form = `csrfToken=${encodeURIComponent(csrf)}&email=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`;
    fs.writeFileSync(signinDataPath, form, 'utf8');
    run(`curl -s -X POST -L -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" -H "Content-Type: application/x-www-form-urlencoded" --data-binary @"${signinDataPath}" "${BASE}/api/auth/callback/credentials" -D "${path.join(ROOT,'scripts','signin_headers.txt')}" -o "${path.join(ROOT,'scripts','signin_resp.txt')}"`);

    // 3) Trigger /api/2fa/setup (creates pending secret server-side)
    run(`curl -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" "${BASE}/api/2fa/setup" -o "${path.join(ROOT,'scripts','setup.json')}" -D "${path.join(ROOT,'scripts','setup_headers.txt')}"`);
    const setup = JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','setup.json'), 'utf8'));
    console.log('[test-http] setup response keys:', Object.keys(setup));

    // 4) Read pendingTotpSecret directly from DB (test only)
    const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true, pendingTotpSecret: true } });
    if (!user || !user.pendingTotpSecret) throw new Error('pendingTotpSecret not found in DB');
    const secret = user.pendingTotpSecret;
    console.log('[test-http] pending secret (from DB):', secret);

    // 5) Generate token from secret (robust: handle sync/async shapes)
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

    const token = await generateToken(secret);
    console.log('[test-http] generated token:', token);

    // 6) Call /api/2fa/enable with token (JSON)
    const enablePayloadPath = path.join(ROOT, 'scripts', 'enable_payload.json');
    fs.writeFileSync(enablePayloadPath, JSON.stringify({ token }), 'utf8');
    run(`curl -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" -X POST -H "Content-Type: application/json" --data @"${enablePayloadPath}" "${BASE}/api/2fa/enable" -o "${path.join(ROOT,'scripts','enable.json')}" -D "${path.join(ROOT,'scripts','enable_headers.txt')}"`);
    const enable = JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','enable.json'), 'utf8'));
    console.log('[test-http] enable response:', enable);

    // 7) Call /api/2fa/validate to trigger unstable_update (mark totpVerified)
    const validatePayloadPath = path.join(ROOT, 'scripts', 'validate_payload.json');
    fs.writeFileSync(validatePayloadPath, JSON.stringify({ token }), 'utf8');
    run(`curl -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" -X POST -H "Content-Type: application/json" --data @"${validatePayloadPath}" "${BASE}/api/2fa/validate" -o "${path.join(ROOT,'scripts','validate.json')}" -D "${path.join(ROOT,'scripts','validate_headers.txt')}"`);
    const validate = JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','validate.json'), 'utf8'));
    console.log('[test-http] validate response:', validate);

    // 8) Read session via /api/auth/session
    run(`curl -s -b "${COOKIE_JAR}" "${BASE}/api/auth/session" -o "${path.join(ROOT,'scripts','session.json')}" -D "${path.join(ROOT,'scripts','session_headers.txt')}"`);
    const session = JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','session.json'), 'utf8'));
    console.log('[test-http] session keys:', Object.keys(session));
    console.log('[test-http] session.user.totpVerified:', session.user && session.user.totpVerified);

    console.log('[test-http] HTTP TOTP flow completed.');
  } catch (err) {
    console.error('[test-http] Error:', err);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
