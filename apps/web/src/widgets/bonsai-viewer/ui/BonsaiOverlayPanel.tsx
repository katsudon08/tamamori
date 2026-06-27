import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, X } from 'lucide-react';

type BonsaiOverlayPanelProps = {
    children: ReactNode;
};

export function BonsaiOverlayPanel({ children }: BonsaiOverlayPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setIsOpen(false);
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <>
            {!isOpen && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    aria-label="統計を表示"
                    className="md:hidden absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-main text-background shadow-lg"
                >
                    <BarChart3 size={20} aria-hidden="true" />
                </button>
            )}

            <aside
                className={`absolute bottom-4 right-4 w-80 lg:w-96 max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto rounded-lg border border-main-light bg-background p-5 shadow-xl ${isOpen ? 'block' : 'hidden md:block'}`}
            >
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="統計を閉じる"
                    className="md:hidden absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-sub hover:bg-main-light"
                >
                    <X size={18} aria-hidden="true" />
                </button>
                {children}
            </aside>
        </>
    );
}
