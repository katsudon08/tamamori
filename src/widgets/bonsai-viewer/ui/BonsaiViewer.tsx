'use client';

import { BonsaiStatusPanel } from './BonsaiStatusPanel';

import type { Bonsai } from '@/entities/bonsai';
import { BonsaiScene } from '@/entities/bonsai';

type BonsaiViewerUser = { display_name: string; avatar_url: string | null };

type BonsaiViewerProps = {
    bonsai: Bonsai;
    user: BonsaiViewerUser;
    nextStageThresholds: {
        min_messages: number;
        min_reactions: number;
        min_thanks: number;
    } | null;
    className?: string;
};

export function BonsaiViewer({ bonsai, user, nextStageThresholds, className }: BonsaiViewerProps) {
    return (
        <div className={`flex flex-col gap-6 md:flex-row ${className ?? ''}`}>
            <div className="min-h-[50vh] flex-1 md:min-h-0">
                <BonsaiScene visualState={bonsai.visual_state} className="h-full w-full" />
            </div>
            <BonsaiStatusPanel
                stage={bonsai.growth_stage}
                totalMessages={bonsai.total_messages}
                totalReactions={bonsai.total_reactions}
                totalThanks={bonsai.total_thanks}
                user={user}
                nextStageThresholds={nextStageThresholds}
                className="md:w-80 lg:w-96"
            />
        </div>
    );
}
