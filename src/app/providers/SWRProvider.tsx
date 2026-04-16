'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

export function SWRProvider({ children }: { children: ReactNode }) {
    return (
        <SWRConfig
            value={{
                revalidateOnFocus: false,
                onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
                    if (
                        error &&
                        typeof error === 'object' &&
                        'status' in error &&
                        typeof error.status === 'number' &&
                        error.status >= 400 &&
                        error.status < 500
                    )
                        return;
                    if (retryCount >= 3) return;
                    setTimeout(
                        () => revalidate({ retryCount }),
                        Math.min(1000 * 2 ** retryCount, 10000),
                    );
                },
            }}
        >
            {children}
        </SWRConfig>
    );
}
