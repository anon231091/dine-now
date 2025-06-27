import { Locale } from "@/i18n/types";
import { MenuItem, MenuItemVariant } from "@dine-now/shared";

// Helper functions for variants
export const getDefaultVariant = (item: MenuItem) => {
  if (!item?.variants?.length) return null;
  return item.variants.find((v: MenuItemVariant) => v.isDefault) || item.variants[0];
};

export const getVariantPrice = (variant: MenuItemVariant) => {
  return typeof variant?.price === 'number' ? variant.price : parseFloat(variant?.price || '0');
};

export const formatVariantName = (variant: MenuItemVariant, locale: Locale) => {
  if (locale === 'km' && variant?.nameKh) {
    return variant.nameKh;
  }
  return variant?.name || variant?.size || 'Regular';
};
