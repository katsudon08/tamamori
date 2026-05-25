/**
 * @jest-environment jsdom
 */
import { describe, test, expect } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
    test('role="status" と aria-label を持つ', () => {
        render(<Skeleton className="h-10 w-40" />);

        const el = screen.getByRole('status');
        expect(el).toHaveAttribute('aria-label', '読み込み中');
    });

    test('デフォルトで animate-pulse クラスを持つ', () => {
        render(<Skeleton className="h-10 w-40" />);

        const el = screen.getByRole('status');
        expect(el.className).toContain('animate-pulse');
    });

    test('animate=false で animate-pulse が付かない', () => {
        render(<Skeleton className="h-10 w-40" animate={false} />);

        const el = screen.getByRole('status');
        expect(el.className).not.toContain('animate-pulse');
    });

    test('shape="circle" で rounded-full になる', () => {
        render(<Skeleton shape="circle" className="h-12 w-12" />);

        const el = screen.getByRole('status');
        expect(el.className).toContain('rounded-full');
        expect(el.className).not.toContain('rounded-md');
    });

    test('shape="rect" (デフォルト) で rounded-md になる', () => {
        render(<Skeleton className="h-10 w-40" />);

        const el = screen.getByRole('status');
        expect(el.className).toContain('rounded-md');
    });

    test('className が渡される', () => {
        render(<Skeleton className="h-48 w-full" />);

        const el = screen.getByRole('status');
        expect(el.className).toContain('h-48');
        expect(el.className).toContain('w-full');
    });

    test('tamamori バリアントのスタイルがデフォルトで適用される', () => {
        render(<Skeleton className="h-10 w-40" />);

        const el = screen.getByRole('status');
        expect(el.className).toContain('bg-main-light');
    });

    test('light バリアントのスタイルが適用される', () => {
        render(<Skeleton variant="light" className="h-10 w-40" />);

        const el = screen.getByRole('status');
        expect(el.className).toContain('bg-gray-200');
    });
});
