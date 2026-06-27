import { createFileRoute } from "@tanstack/react-router";

import { useAllBonsai } from "@/entities/bonsai";
import { useAllBonsaiRealtime } from "@/features/realtime-sync";
import { useMe } from "@/features/slack-auth";
import { ErrorFallback, Skeleton } from "@/shared/ui";
import { GardenViewer, type GardenBonsaiItem } from "@/widgets/garden-viewer";

export const Route = createFileRoute("/_authed/garden")({ component: GardenPage });

function GardenPage() {
  const { data: me } = useMe();
  const slackTeamId = me?.slackTeamId;
  const { data, error, isLoading, mutate } = useAllBonsai(slackTeamId);
  useAllBonsaiRealtime(slackTeamId);

  if (isLoading) {
    return (
      <div
        data-testid="loading"
        className="grid h-full w-full grid-cols-2 gap-4 p-6 md:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return <ErrorFallback onRetry={() => mutate()} />;
  }

  // SWR が返す Database 型 (visual_state: Json) は widget の具体型より広いため、
  // unknown を経由して narrow させる。
  const bonsaiList = (data ?? []) as unknown as GardenBonsaiItem[];

  return (
    <div className="h-full w-full">
      <GardenViewer bonsaiList={bonsaiList} />
    </div>
  );
}
