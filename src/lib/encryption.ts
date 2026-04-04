/**
 * src/lib/encryption.ts — AES-256-GCM symmetric encryption for sensitive tokens
 *
 * Used to encrypt Plaid access tokens and Gmail OAuth tokens before storing
 * them in the database. The key is derived from AUTH_SECRET via PBKDF2.
 *
 * Security:
 *  - AES-256-GCM provides both encryption AND authentication (AEAD)
 *  - A new random IV is generated per encryption — never reused
 *  - Ciphertext format: iv(12 bytes) + authTag(16 bytes) + ciphertext (hex-encoded)
 */
import "server-only";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LEN    = 12;  // GCM standard
const KEY_LEN   = 32;  // 256-bit

/** Derive a 32-byte key from AUTH_SECRET using PBKDF2 */
function getDerivedKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return crypto.pbkdf2Sync(
    secret,
    "subzero-token-encryption-salt-v1", // static salt — key uniqueness from secret
    100_000,
    KEY_LEN,
    "sha256"
  );
}

/**
 * Encrypt a plaintext string.
 * @returns hex string: `${iv}:${authTag}:${ciphertext}`
 */
export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv  = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag   = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypt a hex string produced by `encrypt()`.
 * @throws if the auth tag doesn't match (tampered data)
 */
export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid ciphertext format");

  const key     = getDerivedKey();
  const iv      = Buffer.from(ivHex,  "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const data    = Buffer.from(dataHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
