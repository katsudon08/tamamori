import { createRootRoute, Outlet } from "@tanstack/react-router";

import { SWRProvider } from "@/app/providers/SWRProvider";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <SWRProvider>
      <Outlet />
    </SWRProvider>
  );
}

function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-main">404</h1>
      <p className="text-sub">ページが見つかりません</p>
    </div>
  );
}
