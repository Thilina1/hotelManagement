
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'Victoria Retreat',
  description: 'Manage your hotel and restaurant with ease.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
          <FirebaseClientProvider>
              {children}
              <Toaster />
          </FirebaseClientProvider>
      </body>
    </html>
  );
}
