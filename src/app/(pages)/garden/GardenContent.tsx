'use client';

import { GardenViewer } from '@/widgets/garden-viewer';
import type { GardenBonsaiItem } from '@/widgets/garden-viewer';
import { useAllBonsaiRealtime } from '@/features/realtime-sync';
import { useAllBonsai } from '@/entities/bonsai';
import { Skeleton, ErrorFallback } from '@/shared/ui';

export function GardenContent() {
    const { data, error, isLoading, mutate } = useAllBonsai();
    useAllBonsaiRealtime();

    if (isLoading) {
        return (
            <div data-testid="loading" className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (error && !data) {
        return <ErrorFallback onRetry={() => mutate()} />;
    }

    const bonsaiList = (data ?? []) as GardenBonsaiItem[];

    return <GardenViewer bonsaiList={bonsaiList} />;
}
