export type Variant = 'tamamori' | 'light' | 'dark';

export const progressBarStyles: Record<Variant, { track: string; fill: string; text: string }> = {
    tamamori: {
        track: 'bg-main-light',
        fill: 'bg-gradient-to-r from-sub to-main',
        text: 'text-sub',
    },
    light: {
        track: 'bg-gray-200',
        fill: 'bg-blue-500',
        text: 'text-gray-600',
    },
    dark: {
        track: 'bg-gray-700',
        fill: 'bg-indigo-500',
        text: 'text-gray-300',
    },
};

export const headerStyles: Record<Variant, { header: string; title: string; nav: string }> = {
    tamamori: {
        header: 'border-b border-sub/30',
        title: 'text-2xl font-brush whitespace-nowrap text-main',
        nav: 'font-brush text-lg text-foreground/80',
    },
    light: {
        header: 'border-b border-gray-200 bg-white',
        title: 'text-xl font-bold whitespace-nowrap text-gray-900',
        nav: 'text-base text-gray-600',
    },
    dark: {
        header: 'border-b border-gray-700 bg-gray-900',
        title: 'text-xl font-bold whitespace-nowrap text-gray-100',
        nav: 'text-base text-gray-400',
    },
};
