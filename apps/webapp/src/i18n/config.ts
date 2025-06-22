export const defaultLocale = 'km';

export const timeZone = 'Asia/Phnom_Penh';

export const locales = [defaultLocale, 'en'] as const;

export const localesMap = [
  { key: 'en', title: 'English' },
  { key: 'km', title: 'Khmer' },
];

export const localeCurrency = {
  'en': 'USD',
  'km': 'KHR',
};
