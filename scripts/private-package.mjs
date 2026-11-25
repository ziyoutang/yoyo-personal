import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

export function seal(files) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const bytes = Buffer.concat([cipher.update(gzipSync(JSON.stringify(files))), cipher.final()]);
  return { key, payload: Buffer.concat([iv, bytes, cipher.getAuthTag()]) };
}

export function unseal(payload, key) {
  const decipher = createDecipheriv('aes-256-gcm', key, payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(-16));
  return JSON.parse(gunzipSync(Buffer.concat([decipher.update(payload.subarray(12, -16)), decipher.final()])));
}
