import { type PropsWithChildren } from 'react';
import { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Toaster } from 'react-hot-toast';

import { I18nProvider } from '@/providers/I18nProvider';
import { QueryProvider } from '@/providers/QueryProvider';

import '@telegram-apps/telegram-ui/dist/styles.css';
import 'normalize.css/normalize.css';
import './_assets/globals.css';
import { Root } from '@/components/Root';

export const metadata: Metadata = {
  title: 'DineNow - Restaurant Ordering',
  description: 'Order food from your favorite restaurants in Cambodia',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#000000',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <I18nProvider>
          <Root>
            <QueryProvider>
              {children}
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
            </QueryProvider>
          </Root>
        </I18nProvider>
      </body>
    </html>
  );
}
