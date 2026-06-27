import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

import { LogoutButton, useMe } from "@/features/slack-auth";
import { Header, NavLink } from "@/shared/ui";

export const Route = createFileRoute("/_authed")({ component: AuthedLayout });

function AuthedLayout() {
  const { data: me, isLoading } = useMe();

  if (isLoading) return null;
  if (!me) return <Navigate to="/" />;

  return (
    <>
      <Header
        rightSlot={
          <div className="flex items-center gap-3">
            {me.avatarUrl ? (
              <img
                src={me.avatarUrl}
                alt={me.displayName}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
            ) : null}
            <span className="text-sm text-sub">{me.displayName}</span>
            <LogoutButton className="text-sm text-sub hover:text-main" />
          </div>
        }
      >
        <NavLink href="/garden">花壇</NavLink>
        <NavLink href="/bonsai/me" matchPaths={[`/bonsai/${me.userId}`]}>
          自分の盆栽
        </NavLink>
        <NavLink href="/stats">統計</NavLink>
      </Header>
      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <Outlet />
      </main>
    </>
  );
}
