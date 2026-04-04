import { describe, test, expect } from '@jest/globals';
import { createHmac } from 'node:crypto';
import { verifySignature } from '../verify-signature';

const SIGNING_SECRET = 'test-signing-secret';

/** テスト用の正しい署名を生成する */
function makeSignature(
  body: string,
  timestamp: number,
  secret = SIGNING_SECRET,
): string {
  const baseString = `v0:${timestamp}:${body}`;
  const hash = createHmac('sha256', secret).update(baseString).digest('hex');
  return `v0=${hash}`;
}

function nowTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

describe('verifySignature', () => {
  const body = '{"type":"url_verification","challenge":"xxx"}';

  test('正しい署名でtrueが返却される', () => {
    const timestamp = nowTimestamp();
    const signature = makeSignature(body, timestamp);

    const result = verifySignature({
      body,
      timestamp: String(timestamp),
      signature,
      signingSecret: SIGNING_SECRET,
    });

    expect(result).toBe(true);
  });

  test('ボディが改竄された場合にfalseが返却される', () => {
    const timestamp = nowTimestamp();
    const signature = makeSignature(body, timestamp);

    const result = verifySignature({
      body: body + 'tampered',
      timestamp: String(timestamp),
      signature,
      signingSecret: SIGNING_SECRET,
    });

    expect(result).toBe(false);
  });

  test('タイムスタンプが5分超過で拒否される', () => {
    const oldTimestamp = nowTimestamp() - 6 * 60; // 6分前
    const signature = makeSignature(body, oldTimestamp);

    const result = verifySignature({
      body,
      timestamp: String(oldTimestamp),
      signature,
      signingSecret: SIGNING_SECRET,
    });

    expect(result).toBe(false);
  });

  test('署名ヘッダーが欠損した場合にfalseが返却される', () => {
    const timestamp = nowTimestamp();

    const result = verifySignature({
      body,
      timestamp: String(timestamp),
      signature: '',
      signingSecret: SIGNING_SECRET,
    });

    expect(result).toBe(false);
  });

  test('タイムスタンプヘッダーが欠損した場合にfalseが返却される', () => {
    const signature = makeSignature(body, nowTimestamp());

    const result = verifySignature({
      body,
      timestamp: '',
      signature,
      signingSecret: SIGNING_SECRET,
    });

    expect(result).toBe(false);
  });
});
