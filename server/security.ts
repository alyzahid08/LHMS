import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const secret = process.env.LEVELOSE_DATA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error("A Levelose data-encryption key is required.");
  return createHash("sha256").update(secret).digest();
}

/** Encrypts identity numbers before persistence using AES-256-GCM. */
export function encryptSensitive(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

/** Decrypt only in a server-side authorization path; never return this to resident-facing lists. */
export function decryptSensitive(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function maskIdentity(value: string) {
  return value.length < 5 ? "••••" : `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}
