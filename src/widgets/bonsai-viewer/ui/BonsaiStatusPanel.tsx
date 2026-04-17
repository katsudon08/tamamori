import { MessageSquare, ThumbsUp, Heart } from 'lucide-react';
import Image from 'next/image';

import type { GrowthStage } from '@/entities/bonsai';
import { StageIndicator, BonsaiProgressBar } from '@/entities/bonsai';

type BonsaiViewerUser = { display_name: string; avatar_url: string | null };

type StageThresholds = {
    min_messages: number;
    min_reactions: number;
    min_thanks: number;
};

type BonsaiStatusPanelProps = {
    stage: GrowthStage;
    totalMessages: number;
    totalReactions: number;
    totalThanks: number;
    user: BonsaiViewerUser;
    nextStageThresholds: StageThresholds | null;
    className?: string;
};

function counterPct(current: number, target: number): number {
    return target <= 0 ? 1 : Math.min(current / target, 1);
}

function Avatar({ user }: { user: BonsaiViewerUser }) {
    if (user.avatar_url) {
        return (
            <Image
                src={user.avatar_url}
                alt={user.display_name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
                unoptimized
            />
        );
    }

    return (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-main-light text-main text-lg font-bold">
            {user.display_name.charAt(0)}
        </span>
    );
}

const COUNTER_CONFIG = [
    { key: 'messages', label: 'メッセージ', Icon: MessageSquare },
    { key: 'reactions', label: 'リアクション', Icon: ThumbsUp },
    { key: 'thanks', label: '感謝', Icon: Heart },
] as const;

export function BonsaiStatusPanel({
    stage,
    totalMessages,
    totalReactions,
    totalThanks,
    user,
    nextStageThresholds,
    className,
}: BonsaiStatusPanelProps) {
    const counters = [totalMessages, totalReactions, totalThanks];

    const isMaxStage = nextStageThresholds === null;
    const overallPct = isMaxStage
        ? 100
        : Math.round(
              Math.min(
                  counterPct(totalMessages, nextStageThresholds.min_messages),
                  counterPct(totalReactions, nextStageThresholds.min_reactions),
                  counterPct(totalThanks, nextStageThresholds.min_thanks),
              ) * 100,
          );

    return (
        <div className={`flex flex-col gap-5 ${className ?? ''}`}>
            {/* ユーザー情報 */}
            <div className="flex items-center gap-3">
                <Avatar user={user} />
                <span className="text-lg font-medium text-main">{user.display_name}</span>
            </div>

            {/* ステージ */}
            <div>
                <StageIndicator stage={stage} />
            </div>

            {/* カウンター */}
            <div className="grid grid-cols-3 gap-3">
                {COUNTER_CONFIG.map(({ key, label, Icon }, i) => (
                    <div
                        key={key}
                        className="flex flex-col items-center gap-1 rounded-lg bg-base-light p-3"
                    >
                        <Icon size={18} className="text-sub" aria-hidden="true" />
                        <span className="text-xl font-bold text-main">{counters[i]}</span>
                        <span className="text-xs text-sub">{label}</span>
                    </div>
                ))}
            </div>

            {/* 進捗バー */}
            <div>
                <p className="mb-2 text-sm font-medium text-sub">
                    {isMaxStage ? '満開です！' : '次のステージまで'}
                </p>
                <BonsaiProgressBar current={overallPct} target={100} />
            </div>
        </div>
    );
}
