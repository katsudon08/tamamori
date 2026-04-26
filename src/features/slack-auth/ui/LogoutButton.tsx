'use client';

import { type MouseEvent } from 'react';

import { navigateTo } from './navigate';

import { clearSessionToken } from '@/shared/lib/supabase';

interface LogoutButtonProps {
    className?: string;
}

/**
 * ログアウト用リンク (Client Component)。
 *
 * クリック時の流れ:
 *   1. デフォルト遷移を抑止
 *   2. token-cache のメモリキャッシュを破棄 (in-memory JWT 残骸の即時消去)
 *   3. `/api/auth/logout` に明示的に遷移 (サーバ側で iron-session を destroy)
 *
 * 完全なページ遷移により、各 Realtime hook が保持していた WebSocket / Supabase
 * client インスタンスは React のアンマウントで破棄される (シングルトン撤去後の
 * 設計と整合)。SPA 遷移で同一テナントのまま再購読し直す場面はないため、
 * 明示的な `removeAllChannels` は省略する。
 */
export function LogoutButton({ className }: LogoutButtonProps) {
    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        clearSessionToken();
        navigateTo('/api/auth/logout');
    }

    return (
        <a href="/api/auth/logout" onClick={handleClick} className={className}>
            ログアウト
        </a>
    );
}
