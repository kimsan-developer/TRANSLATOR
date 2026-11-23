import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../backend/dist/utils/crypto.js';

test('Crypto: AES-256 API Key Encryption & Decryption', () => {
  const rawKey = 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';
  const encrypted = encryptApiKey(rawKey);

  assert.notEqual(encrypted, rawKey);
  assert.ok(encrypted.includes(':'));

  const decrypted = decryptApiKey(encrypted);
  assert.equal(decrypted, rawKey);
});

test('Crypto: API Key Masking', () => {
  const rawKey = 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';
  const masked = maskApiKey(rawKey);

  assert.equal(masked, 'sk-p...wxyz');
});
