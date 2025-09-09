import './globals.css';
import React from 'react';

export const metadata = { title: process.env.NEXT_PUBLIC_APP_NAME || 'Pennywise AI' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-text">
        {children}
      </body>
    </html>
  );
}
