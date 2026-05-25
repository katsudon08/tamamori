import { navigateTo } from '../browser/navigate';
import { clearSessionToken } from '../supabase';

export const SESSION_EXPIRED_LOGOUT_URL = '/api/auth/logout?reason=session_expired';

let handlingSessionExpired = false;

export function isSessionExpiredError(error: unknown): boolean {
    return error instanceof Error && error.message === 'session_expired';
}

export function handleSessionExpired(): void {
    if (handlingSessionExpired) return;
    handlingSessionExpired = true;

    clearSessionToken();
    navigateTo(SESSION_EXPIRED_LOGOUT_URL);
}

export function resetSessionExpiredHandlingForTests(): void {
    handlingSessionExpired = false;
}
