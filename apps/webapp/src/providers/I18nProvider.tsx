import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import React, { PropsWithChildren } from 'react';

import { timeZone } from '@/core/i18n/config';

export async function I18nProvider({
  children,
}: PropsWithChildren) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
};
