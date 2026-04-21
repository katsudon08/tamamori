'use client';

import { BonsaiViewer } from '@/widgets/bonsai-viewer';
import { useBonsaiRealtime } from '@/features/realtime-sync';
import { getNextStageThresholds, type GrowthRule } from '@/features/bonsai-growth';
import { useBonsai, bonsaiSchema } from '@/entities/bonsai';
import { Skeleton, ErrorFallback } from '@/shared/ui';

type BonsaiPageContentProps = {
    userId: string;
    slackTeamId: string;
    growthRules: GrowthRule[];
};

export function BonsaiPageContent({ userId, slackTeamId, growthRules }: BonsaiPageContentProps) {
    const { data, error, isLoading, mutate } = useBonsai(userId, slackTeamId);
    useBonsaiRealtime(userId);

    if (isLoading) {
        return (
            <div data-testid="loading" className="relative h-full w-full">
                <Skeleton className="absolute inset-0 rounded-none" />
                <div className="absolute bottom-4 right-4 hidden md:flex w-80 lg:w-96 max-w-[calc(100%-2rem)] flex-col gap-5 rounded-lg border border-main-light bg-background p-5 shadow-xl">
                    <div className="flex items-center gap-3">
                        <Skeleton shape="circle" className="h-12 w-12" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <div className="grid grid-cols-3 gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-lg" />
                        ))}
                    </div>
                    <Skeleton className="h-3 w-full rounded-md" />
                </div>
            </div>
        );
    }

    if (error && !data) {
        return <ErrorFallback onRetry={() => mutate()} />;
    }

    if (!data) return null;

    const bonsai = bonsaiSchema.parse(data);
    const nextStageThresholds = getNextStageThresholds(bonsai.growth_stage, growthRules);

    return (
        <BonsaiViewer bonsai={bonsai} user={data.users} nextStageThresholds={nextStageThresholds} />
    );
}
