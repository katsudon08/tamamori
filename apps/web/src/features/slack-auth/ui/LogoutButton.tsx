import { navigateTo } from './navigate';

import { clearSessionToken } from '@/shared/lib/supabase';

interface LogoutButtonProps {
    className?: string;
}

/**
 * ログアウト用ボタン (Client Component)。
 *
 * クリック時の流れ:
 *   1. token-cache のメモリキャッシュを破棄 (in-memory JWT 残骸の即時消去)
 *   2. `/api/auth/logout` に明示的に遷移 (サーバ側で iron-session を destroy)
 *
 * 完全なページ遷移により、各 Realtime hook が保持していた WebSocket / Supabase
 * client インスタンスは React のアンマウントで破棄される (シングルトン撤去後の
 * 設計と整合)。SPA 遷移で同一テナントのまま再購読し直す場面はないため、
 * 明示的な `removeAllChannels` は省略する。
 */
export function LogoutButton({ className }: LogoutButtonProps) {
    function handleClick() {
        clearSessionToken();
        navigateTo('/api/auth/logout');
    }

    return (
        <button type="button" onClick={handleClick} className={className}>
            ログアウト
        </button>
    );
}
