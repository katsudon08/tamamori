import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useMe } from "@/features/slack-auth";
import { LandingContent } from "@/widgets/landing";

export const Route = createFileRoute("/")({
  component: Home,
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
});

function Home() {
  const { error } = Route.useSearch();
  const { data: me, isLoading } = useMe();

  if (isLoading) return null;
  if (me) return <Navigate to="/garden" />;
  return <LandingContent error={error} />;
}
