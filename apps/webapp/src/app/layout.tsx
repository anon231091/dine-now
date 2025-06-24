import { type PropsWithChildren } from 'react';
import { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { Toaster } from 'react-hot-toast';

import { QueryProvider } from '@/providers/QueryProvider';
import { BottomNavigation } from '@/components/Navigation';

import '@telegram-apps/telegram-ui/dist/styles.css';
import 'normalize.css/normalize.css';
import './_assets/globals.css';

export const metadata: Metadata = {
  title: 'DineNow - Restaurant Ordering',
  description: 'Order food from your favorite restaurants in Cambodia'
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <QueryProvider>
            <AppRoot>
              <main className="pb-16">
                {children}
              </main>
              <BottomNavigation />
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'var(--tg-theme-bg-color)',
                    color: 'var(--tg-theme-text-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    borderRadius: '8px',
                    padding: '12px',
                  },
                  success: {
                    iconTheme: {
                      primary: 'var(--tg-theme-link-color)',
                      secondary: 'var(--tg-theme-button-text-color)',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: 'var(--tg-theme-destructive-text-color)',
                      secondary: 'var(--tg-theme-button-text-color)',
                    },
                  },
                }}
              />
            </AppRoot>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
