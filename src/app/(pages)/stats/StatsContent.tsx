'use client';

import { useState, useMemo } from 'react';

import { GrowthTimeline, ActionBreakdown } from '@/widgets/stats-panel';
import { useActionLogs, type ActionLog } from '@/entities/action';

type DateRange = '7d' | '30d' | 'all';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
    { value: '7d', label: '直近7日' },
    { value: '30d', label: '直近30日' },
    { value: 'all', label: '全期間' },
];

function computeStartDate(range: DateRange): string {
    if (range === 'all') return '2020-01-01';
    const days = range === '7d' ? 7 : 30;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

type StatsContentProps = {
    userId: string;
};

export function StatsContent({ userId }: StatsContentProps) {
    const [range, setRange] = useState<DateRange>('7d');
    const startDate = useMemo(() => computeStartDate(range), [range]);
    const { data, error, isLoading } = useActionLogs(userId, startDate);

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

    const actions = (data ?? []) as ActionLog[];

    return (
        <div className="mx-auto max-w-3xl px-6 py-8">
            <div className="mb-6 flex items-center gap-2" role="group" aria-label="期間選択">
                {DATE_RANGE_OPTIONS.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setRange(value)}
                        aria-pressed={range === value}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                            range === value
                                ? 'bg-main text-white'
                                : 'bg-main-light/30 text-foreground hover:bg-main-light/50'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <section className="mb-8">
                <h2 className="mb-4 text-lg font-semibold">アクティビティ推移</h2>
                <GrowthTimeline actions={actions} />
            </section>
            <section>
                <h2 className="mb-4 text-lg font-semibold">アクション内訳</h2>
                <ActionBreakdown actions={actions} />
            </section>
        </div>
    );
}
