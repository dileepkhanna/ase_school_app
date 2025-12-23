import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';

export async function hashPassword(plain: string, saltRounds: number): Promise<string> {
  return bcrypt.hash(plain, saltRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Generates numeric OTP (default length 6).
 * Uses crypto-secure randomness.
 */
export function generateNumericOtp(length = 6): string {
  if (length < 4 || length > 8) throw new Error('OTP length must be between 4 and 8');

  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += String(randomInt(0, 10));
  }

  // Ensure first digit is not 0 for nicer UX (optional)
  if (otp[0] === '0') {
    otp = String(randomInt(1, 10)) + otp.slice(1);
  }
  return otp;
}

/**
 * Hash OTP before storing in DB (never store raw OTP).
 * Use SHA-256 (fast) + optional per-record salt (recommended).
 */
export function hashOtp(rawOtp: string, salt?: string): string {
  const input = salt ? `${rawOtp}:${salt}` : rawOtp;
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Random salt for OTP hashing / tokens.
 */
export function randomHex(bytes = 16): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * URL-safe random id (for referral ids, upload ids, etc.)
 * Works in CommonJS (no nanoid).
 */
export function randomId(size = 12): string {
  if (size < 6 || size > 64) throw new Error('randomId size must be between 6 and 64');

  // base64url gives URL-safe chars: A-Z a-z 0-9 - _
  // We generate more bytes than needed and slice to requested length.
  const bytesNeeded = Math.ceil((size * 3) / 4) + 2;
  return randomBytes(bytesNeeded).toString('base64url').slice(0, size);
}

/**
 * Timing-safe string comparison to reduce side-channel leakage.
 */
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
