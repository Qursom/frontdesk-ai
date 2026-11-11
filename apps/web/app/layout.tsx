import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

// next/font self-hosts the files at build time, so visitors' browsers never call Google (GDPR).
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-fraunces',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Bright Smile Dental - Demo | FrontDesk AI',
  description: 'Demo website for a fictional dental clinic, showcasing the FrontDesk AI website assistant.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      {/* suppressHydrationWarning prevents noise from browser extensions (e.g. Grammarly) that inject attributes into <body> */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
