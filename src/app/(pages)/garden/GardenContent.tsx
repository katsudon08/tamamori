'use client';

import { GardenViewer } from '@/widgets/garden-viewer';
import type { GardenBonsaiItem } from '@/widgets/garden-viewer';
import { useAllBonsaiRealtime } from '@/features/realtime-sync';
import { useAllBonsai } from '@/entities/bonsai';

export function GardenContent() {
    const { data, error, isLoading } = useAllBonsai();
    useAllBonsaiRealtime();

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

    const bonsaiList = (data ?? []) as GardenBonsaiItem[];

    return <GardenViewer bonsaiList={bonsaiList} />;
}
