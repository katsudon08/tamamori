import { createHmac, timingSafeEqual } from 'node:crypto';

const FIVE_MINUTES_IN_SECONDS = 5 * 60;

export interface VerifySignatureParams {
  body: string;
  timestamp: string;
  signature: string;
  signingSecret: string;
}

export function verifySignature({
  body,
  timestamp,
  signature,
  signingSecret,
}: VerifySignatureParams): boolean {
  if (!timestamp || !signature) {
    return false;
  }

  const ts = Number(timestamp);
  if (Number.isNaN(ts)) {
    return false;
  }

  // リプレイ攻撃防止: タイムスタンプが5分以上離れていたら拒否
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > FIVE_MINUTES_IN_SECONDS) {
    return false;
  }

  // HMAC-SHA256 で署名を計算
  const baseString = `v0:${timestamp}:${body}`;
  const hash = createHmac('sha256', signingSecret)
    .update(baseString)
    .digest('hex');
  const expected = `v0=${hash}`;

  // 定時比較 (timing-safe comparison)
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, actualBuf);
}
