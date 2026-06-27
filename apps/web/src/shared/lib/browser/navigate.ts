/**
 * クライアントサイド遷移の薄いラッパー。
 * window.location.assign は jsdom で差し替えにくいため、テストではこの関数を mock する。
 */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
