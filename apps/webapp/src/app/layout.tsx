import { type PropsWithChildren } from 'react';
import { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';

import { QueryProvider } from '@/providers/QueryProvider';
import { Root } from '@/components/Root';

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
            <Root>
              {children}
            </Root>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
