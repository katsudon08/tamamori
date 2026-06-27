import type { GrowthRule } from '../model/growth-rules';

import type { GrowthStage } from '@/entities/bonsai';

export function getNextStageThresholds(
    currentStage: GrowthStage,
    rules: GrowthRule[],
): { min_messages: number; min_reactions: number; min_thanks: number } | null {
    const currentIndex = rules.findIndex((r) => r.stage === currentStage);
    if (currentIndex < 0 || currentIndex >= rules.length - 1) {
        return null;
    }

    const next = rules[currentIndex + 1];
    return {
        min_messages: next.min_messages,
        min_reactions: next.min_reactions,
        min_thanks: next.min_thanks,
    };
}
