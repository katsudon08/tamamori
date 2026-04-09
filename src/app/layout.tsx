import type { Metadata } from 'next';
import { Geist, Geist_Mono, Hina_Mincho } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

const hinaMincho = Hina_Mincho({
    variable: '--font-brush',
    weight: '400',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'たま森',
    description: 'Slack連携の盆栽育成Webアプリ',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="ja"
            className={`${geistSans.variable} ${geistMono.variable} ${hinaMincho.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    );
}
