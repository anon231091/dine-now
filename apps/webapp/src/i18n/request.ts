import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, locales, timeZone } from './config';
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
  };
});
