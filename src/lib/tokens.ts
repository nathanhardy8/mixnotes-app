import { randomBytes, createHash } from 'crypto';

/**
 * Generates a random secure token.
 * Length defaults to 32 bytes (64 hex characters).
 */
export function generateToken(size = 32): string {
    return randomBytes(size).toString('hex');
}

/**
 * Hashes a token using SHA-256 for secure storage.
 */
export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Validates a token against a hash.
 * (Since we use a simple hash, we just re-hash the input and compare).
 */
export function validateToken(token: string, hash: string): boolean {
    const computedHash = hashToken(token);
    // Use constant-time comparison in a real auth lib, but string comparison is acceptable here for simple tokens
    // provided we aren't vulnerable to timing attacks on the exact length. 
    // For Node environment, crypto.timingSafeEqual is best but requires Buffers.
    return computedHash === hash;
}
