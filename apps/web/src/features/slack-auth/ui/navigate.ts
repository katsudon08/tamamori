/**
 * クライアントサイド遷移の薄いラッパー。
 * `window.location.assign` は jsdom で read-only のためテストでモックしづらいので、
 * このモジュール経由の関数として export することでテストで差し替え可能にしている。
 */
export function navigateTo(url: string): void {
    window.location.assign(url);
}
