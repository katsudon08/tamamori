import { SWRConfig } from "swr";
import type { ReactNode } from "react";

import { handleSessionExpired, isSessionExpiredError } from "@/shared/lib/auth/session-expired";

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        onError: (error) => {
          if (isSessionExpiredError(error)) {
            handleSessionExpired();
          }
        },
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
          if (isSessionExpiredError(error)) {
            handleSessionExpired();
            return;
          }
          if (
            error &&
            typeof error === "object" &&
            "status" in error &&
            typeof error.status === "number" &&
            error.status >= 400 &&
            error.status < 500
          )
            return;
          if (retryCount >= 3) return;
          setTimeout(() => revalidate({ retryCount }), Math.min(1000 * 2 ** retryCount, 10000));
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
