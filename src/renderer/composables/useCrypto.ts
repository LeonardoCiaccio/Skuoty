// ─── Crypto utilities ──────────────────────────────────────────────────────────
// AES-GCM + PBKDF2 helpers used by both session encryption and export/import.

/** Base64 encode a Uint8Array */
export function b64(arr: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...arr))
}

/** Base64 decode to Uint8Array */
export function unb64(s: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(
    atob(s).split('').map(c => c.charCodeAt(0))
  ) as unknown as Uint8Array<ArrayBuffer>
}

/**
 * Derive a 256-bit AES key from password + salt using PBKDF2.
 * Returns raw key bytes (not a CryptoKey) for easy storage/comparison.
 */
export async function pbkdf2Raw(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = 100_000,
): Promise<Uint8Array<ArrayBuffer>> {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  )
  const bits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial, 256,
  )
  return new Uint8Array(bits) as unknown as Uint8Array<ArrayBuffer>
}

/** Import raw key bytes as an AES-GCM CryptoKey. */
async function importAesKey(keyBytes: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return window.crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/**
 * Encrypt a UTF-8 string with AES-GCM.
 * Returns base64-encoded iv and ciphertext.
 */
export async function aesEncryptRaw(
  plaintext: string,
  keyBytes: Uint8Array<ArrayBuffer>,
): Promise<{ iv: string; data: string }> {
  const key = await importAesKey(keyBytes)
  const iv  = window.crypto.getRandomValues(new Uint8Array(12)) as unknown as Uint8Array<ArrayBuffer>
  const enc = new TextEncoder()
  const ct  = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  )
  return { iv: b64(iv), data: b64(new Uint8Array(ct) as unknown as Uint8Array<ArrayBuffer>) }
}

/**
 * Decrypt AES-GCM ciphertext.
 * Throws DOMException on wrong key / tampered data.
 */
export async function aesDecryptRaw(
  ivB64: string,
  dataB64: string,
  keyBytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const key  = await importAesKey(keyBytes)
  const iv   = unb64(ivB64)
  const data = unb64(dataB64)
  const pt   = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  )
  return new TextDecoder().decode(pt)
}

// ─── Export / Import helpers (password-based, self-contained blob) ─────────────

interface EncryptedBlob {
  skuoty: true
  salt: string
  iv: string
  enc: string
}

/** Returns true if the parsed JSON looks like an EncryptedBlob. */
export function isEncryptedBlob(obj: unknown): obj is EncryptedBlob {
  return (
    typeof obj === 'object' && obj !== null &&
    (obj as Record<string, unknown>).skuoty === true &&
    typeof (obj as Record<string, unknown>).salt === 'string' &&
    typeof (obj as Record<string, unknown>).iv   === 'string' &&
    typeof (obj as Record<string, unknown>).enc  === 'string'
  )
}

/**
 * Encrypt arbitrary JSON string for export.
 * Generates its own salt; result is a self-contained JSON blob.
 */
export async function encryptData(json: string, password: string): Promise<string> {
  const salt    = window.crypto.getRandomValues(new Uint8Array(16)) as unknown as Uint8Array<ArrayBuffer>
  const key     = await pbkdf2Raw(password, salt)
  const { iv, data: enc } = await aesEncryptRaw(json, key)
  const blob: EncryptedBlob = { skuoty: true, salt: b64(salt), iv, enc }
  return JSON.stringify(blob)
}

/**
 * Decrypt an EncryptedBlob produced by encryptData.
 * Throws on wrong password.
 */
export async function decryptData(blobJson: string, password: string): Promise<string> {
  const blob = JSON.parse(blobJson) as EncryptedBlob
  const key  = await pbkdf2Raw(password, unb64(blob.salt))
  return aesDecryptRaw(blob.iv, blob.enc, key)
}
