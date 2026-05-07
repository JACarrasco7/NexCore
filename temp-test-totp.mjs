const otplib = await import('otplib');
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

console.log('TOTP smoke test');
console.log('otplib keys:', Object.keys(otplib));
const secret = otplib.generateSecret();
console.log('Secret:', secret);
let token;
try {
  token = otplib.generateSync ? otplib.generateSync(secret) : await otplib.generate(secret);
} catch (e) {
  // fallback: try generateSync with object
  try {
    token = otplib.generateSync({ secret });
  } catch (e2) {
    console.error('generate error', e, e2);
    throw e2 || e;
  }
}
console.log('Token:', token);
let ok = false;
try {
  ok = otplib.verifySync ? otplib.verifySync(token, secret) : await otplib.verify(token, secret);
} catch (e) {
  try {
    ok = otplib.verifySync({ token, secret });
  } catch (e2) {
    console.error('verify error', e, e2);
    throw e2 || e;
  }
}
console.log('Verify token:', ok);

// backup codes
const plain = [];
const hashed = [];
for (let i = 0; i < 4; i++) {
  const code = crypto.randomBytes(4).toString('hex').slice(0, 8).toUpperCase();
  plain.push(code);
  // eslint-disable-next-line no-await-in-loop
  const h = await bcrypt.hash(code, 10);
  hashed.push(h);
}
console.log('Backup plain:', plain);
// verify one
const idx = 1;
const match = await bcrypt.compare(plain[idx], hashed[idx]);
console.log('Backup verify index', idx, match);
