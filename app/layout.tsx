import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bible Study App',
  description: 'Read, compare, annotate, and study Scripture with your community.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
