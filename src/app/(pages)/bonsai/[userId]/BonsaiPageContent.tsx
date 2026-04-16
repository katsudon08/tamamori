'use client';

import { BonsaiViewer } from '@/widgets/bonsai-viewer';
import { useBonsaiRealtime } from '@/features/realtime-sync';
import { useBonsai, bonsaiSchema } from '@/entities/bonsai';

type BonsaiPageContentProps = {
    userId: string;
    nextStageThresholds: {
        min_messages: number;
        min_reactions: number;
        min_thanks: number;
    } | null;
};

export function BonsaiPageContent({ userId, nextStageThresholds }: BonsaiPageContentProps) {
    const { data, error, isLoading } = useBonsai(userId);
    useBonsaiRealtime(userId);

    if (isLoading) {
        return (
            <div data-testid="loading" className="flex h-full items-center justify-center">
                読み込み中...
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="flex h-full items-center justify-center text-red-500">
                データの取得に失敗しました
            </div>
        );
    }

    if (!data) return null;

    const bonsai = bonsaiSchema.parse(data);

    return (
        <BonsaiViewer bonsai={bonsai} user={data.users} nextStageThresholds={nextStageThresholds} />
    );
}
