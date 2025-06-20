import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { TelegramProvider } from '../providers/TelegramProvider';
import { QueryProvider } from '../providers/QueryProvider';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Restaurant Ordering - Telegram Mini App',
  description: 'Order food from your favorite restaurants in Cambodia',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TelegramProvider>
          <QueryProvider>
            <AppRoot
              appearance="auto"
              platform="ios"
              className="min-h-screen bg-[--tg-theme-bg-color]"
            >
              {children}
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'var(--tg-theme-bg-color)',
                    color: 'var(--tg-theme-text-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                  },
                }}
              />
            </AppRoot>
          </QueryProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}
