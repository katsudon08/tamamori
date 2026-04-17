/**
 * リクエストから origin を取得する。
 * 逆プロキシ (ngrok 等) 経由では x-forwarded-host / x-forwarded-proto を優先し、
 * ヘッダーがなければ request.url から導出する。
 */
export function getRequestOrigin(request: Request): string {
    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedHost) {
        const proto = request.headers.get('x-forwarded-proto') ?? 'https';
        return `${proto}://${forwardedHost}`;
    }
    return new URL(request.url).origin;
}
