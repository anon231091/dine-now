import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, locales, timeZone, localeCurrency } from './config';
import { getLocale } from './locale';
import type { Locale } from './types';

export default getRequestConfig(async () => {
  let locale = (await getLocale()) as Locale;

  if (!locales.includes(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    timeZone, 
    messages: (await import(`@public/locales/${locale}.json`)).default,
    formats: {
      dateTime: {
        date: {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        },
        time: {
          hour: 'numeric',
          minute: '2-digit'
        }
      },
      number: {
        currency: {
          style: 'currency',
          currency: localeCurrency[locale],
        }
      }
    }
  };
});
