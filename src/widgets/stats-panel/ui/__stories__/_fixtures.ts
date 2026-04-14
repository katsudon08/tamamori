import type { ActionLog, ActionType } from '@/entities/action';

let counter = 0;

export function makeActionLog(overrides: Partial<ActionLog> = {}): ActionLog {
    counter += 1;
    return {
        id: `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`,
        user_id: '00000000-0000-0000-0000-000000000010',
        action_type: 'message',
        slack_event_id: `E${String(counter).padStart(6, '0')}`,
        slack_channel: 'C001',
        metadata: {},
        created_at: '2026-04-01T10:00:00Z',
        ...overrides,
    };
}

function generateActions(
    startDate: string,
    days: number,
    perDay: { message: number; reaction: number; thanks: number },
): ActionLog[] {
    const actions: ActionLog[] = [];
    const start = new Date(startDate);

    for (let d = 0; d < days; d++) {
        const date = new Date(start);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().slice(0, 10);

        const types: ActionType[] = ['message', 'reaction', 'thanks'];
        for (const type of types) {
            for (let i = 0; i < perDay[type]; i++) {
                const hour = 9 + i;
                actions.push(
                    makeActionLog({
                        action_type: type,
                        created_at: `${dateStr}T${String(hour).padStart(2, '0')}:00:00Z`,
                    }),
                );
            }
        }
    }

    return actions;
}

export const MOCK_ACTIONS_2WEEKS: ActionLog[] = generateActions('2026-04-01', 14, {
    message: 5,
    reaction: 3,
    thanks: 1,
});

export const MOCK_ACTIONS_EMPTY: ActionLog[] = [];

export const MOCK_ACTIONS_MESSAGES_ONLY: ActionLog[] = generateActions('2026-04-01', 14, {
    message: 6,
    reaction: 0,
    thanks: 0,
});

export const MOCK_ACTIONS_MESSAGE_HEAVY: ActionLog[] = generateActions('2026-04-01', 14, {
    message: 10,
    reaction: 1,
    thanks: 1,
});
