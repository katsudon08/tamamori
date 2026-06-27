import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useMe } from "@/features/slack-auth";

export const Route = createFileRoute("/_authed/bonsai/me")({ component: BonsaiMe });

function BonsaiMe() {
  const { data: me } = useMe();
  if (!me) return <Navigate to="/" />;
  return <Navigate to="/bonsai/$userId" params={{ userId: me.userId }} />;
}
