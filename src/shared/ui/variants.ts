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

export const navLinkStyles: Record<Variant, { active: string; inactive: string }> = {
    tamamori: {
        active: 'text-main underline underline-offset-4 decoration-2',
        inactive: 'hover:text-main transition-colors',
    },
    light: {
        active: 'text-gray-900 font-semibold underline underline-offset-4 decoration-2',
        inactive: 'hover:text-gray-900 transition-colors',
    },
    dark: {
        active: 'text-gray-100 font-semibold underline underline-offset-4 decoration-2',
        inactive: 'hover:text-gray-100 transition-colors',
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

export const skeletonStyles: Record<Variant, { base: string }> = {
    tamamori: { base: 'bg-main-light' },
    light: { base: 'bg-gray-200' },
    dark: { base: 'bg-gray-700' },
};

export const emptyStateStyles: Record<Variant, { title: string; description: string }> = {
    tamamori: { title: 'text-main', description: 'text-foreground/50' },
    light: { title: 'text-gray-900', description: 'text-gray-500' },
    dark: { title: 'text-gray-100', description: 'text-gray-400' },
};

export const errorFallbackStyles: Record<
    Variant,
    { title: string; message: string; button: string }
> = {
    tamamori: {
        title: 'text-accent',
        message: 'text-foreground/70',
        button: 'bg-main text-white hover:bg-main/90',
    },
    light: {
        title: 'text-red-600',
        message: 'text-gray-600',
        button: 'bg-blue-500 text-white',
    },
    dark: {
        title: 'text-red-400',
        message: 'text-gray-300',
        button: 'bg-indigo-500 text-white',
    },
};
