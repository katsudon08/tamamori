'use client';

import { GardenViewer } from '@/widgets/garden-viewer';
import type { GardenBonsaiItem } from '@/widgets/garden-viewer';
import { useAllBonsaiRealtime } from '@/features/realtime-sync';
import { useAllBonsai } from '@/entities/bonsai';
import { Skeleton, ErrorFallback } from '@/shared/ui';

type GardenContentProps = {
    slackTeamId: string;
};

export function GardenContent({ slackTeamId }: GardenContentProps) {
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
    // unknown を経由して narrow させる。Phase 5 (SSR/SWR 整理) で型運用を見直す。
    const bonsaiList = (data ?? []) as unknown as GardenBonsaiItem[];

    return (
        <div className="h-full w-full">
            <GardenViewer bonsaiList={bonsaiList} />
        </div>
    );
}
