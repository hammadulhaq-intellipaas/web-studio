import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Design review · Web Studio',
  robots: { index: false, follow: false },
};

/** The client's review page has its own frame: no site navigation, no admin. */
export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.className} bg-zinc-100 text-zinc-900 antialiased`}>{children}</body>
    </html>
  );
}
