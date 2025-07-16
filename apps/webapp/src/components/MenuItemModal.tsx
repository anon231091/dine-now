'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { 
  Modal,
  Button,
  Title,
  Subheadline,
  Caption,
  Card
} from '@telegram-apps/telegram-ui';
import { Minus, Plus, Clock, X } from 'lucide-react';
import { MenuItemDetails, MenuItemVariant, SpiceLevel } from '@dine-now/shared';
import { useCartStore } from '@/store';
import { getDefaultVariant } from '@/helpers';
import toast from 'react-hot-toast';

interface MenuItemModalProps {
  item: MenuItemDetails & { defaultVariant?: MenuItemVariant };
  isOpen: boolean;
  onClose: () => void;
}

export function MenuItemModal({ item, isOpen, onClose }: MenuItemModalProps) {
  const t = useTranslations('MenuItemModal');
  const locale = useLocale();
  const format = useFormatter();
  
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant>(getDefaultVariant(item));
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<SpiceLevel>('none');
  
  const { addItem } = useCartStore();

  const getItemName = () => {
    if (locale === 'km' && item.nameKh) {
      return item.nameKh;
    }
    return item.name;
  };

  const getItemDescription = () => {
    if (locale === 'km' && item.descriptionKh) {
      return item.descriptionKh;
    }
    return item.description;
  };

  const getVariantDisplayName = (variant: MenuItemVariant) => {
    if (locale === 'km' && variant.nameKh) {
      return variant.nameKh;
    }
    return variant.name || variant.size || t('Regular');
  };

  const totalPrice = useMemo(() => selectedVariant.price * quantity, [selectedVariant, quantity]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(10, quantity + delta));
    setQuantity(newQuantity);
  };

  const handleVariantChange = (variantId: string) => {
    const variant = item.variants.find(v => v.id === variantId);
    if (variant) {
      setSelectedVariant(variant);
    }
  };

  const handleAddToCart = () => {
    if (!item.isAvailable) {
      toast.error(t('This item is out of stock'));
      return;
    }

    if (!selectedVariant) {
      toast.error(t('Please select a size'));
      return;
    }

    if (!selectedVariant.isAvailable) {
      toast.error(t('This size is currently unavailable'));
      return;
    }

    addItem({
      menuItem: item,
      variant: selectedVariant,
      quantity,
      spiceLevel: selectedSpiceLevel,
    });

    toast.success(
      `${t('Added')} ${getItemName()} ${t('to cart')}`
    );
    onClose();
  };

  const spiceLevelOptions: { [key in SpiceLevel ]: {label: string; emoji: string;} } = {
    'none': { label: t('No Spice'), emoji: '' },
    'regular': { label: t('Regular'), emoji: '🌶️' },
    'spicy': { label: t('Spicy'), emoji: '🌶️🌶️' },
    'very_spicy': { label: t('Very Spicy'), emoji: '🌶️🌶️🌶️' },
  };

  if (!item.variants || item.variants.length === 0) {
    return (
      <Modal open={isOpen} onOpenChange={onClose}>
        <div className="p-4 text-center">
          <Title level="2" className="text-[--tg-theme-text-color] mb-4">
            {t('Item Unavailable')}
          </Title>
          <p className="text-[--tg-theme-hint-color] mb-4">
            {t('This item is not available at the moment.')}
          </p>
          <Button mode="filled" onClick={onClose}>
            {t('Close')}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={isOpen}
      onOpenChange={onClose}
      className="max-h-[90vh] overflow-auto"
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Title level="2" className="text-[--tg-theme-text-color] mb-2">
              {getItemName()}
            </Title>
            {getItemDescription() && (
              <Subheadline level="2" className="text-[--tg-theme-hint-color] mb-3">
                {getItemDescription()}
              </Subheadline>
            )}
          </div>
          <Button mode="plain" size="s" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Image */}
        {item.imageUrl && (
          <div className="w-full h-48 bg-[--tg-theme-secondary-bg-color] rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={item.imageUrl} 
              alt={getItemName()}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Price and Time */}
        <div className="flex items-center justify-between p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4 text-[--tg-theme-hint-color]" />
            <Caption level="1" className="text-[--tg-theme-hint-color]">
              {item.preparationTimeMinutes} {t('min')}
            </Caption>
          </div>
          <Title level="3" className="text-[--tg-theme-link-color]">
            {format.number(selectedVariant.price, 'currency')}
          </Title>
        </div>

        {/* Size/Variant Selection */}
        {item.variants.length > 1 && (
          <Card className="p-4">
            <Title level="3" className="text-[--tg-theme-text-color] mb-3">
              {t('Size')}
            </Title>
            <div className="grid grid-cols-3 gap-2">
              {item.variants.filter(v => v.isAvailable).map((variant) => (
                <button
                  key={variant.id}
                  className={`p-3 rounded-lg border transition-colors text-center ${
                    selectedVariant?.id === variant.id
                      ? 'border-[--tg-theme-link-color] bg-[--tg-theme-link-color]/10'
                      : 'border-[--tg-theme-separator-color] hover:bg-[--tg-theme-secondary-bg-color]'
                  }`}
                  onClick={() => handleVariantChange(variant.id)}
                >
                  <div className="text-[--tg-theme-text-color] font-medium text-sm">
                    {getVariantDisplayName(variant)}
                  </div>
                  <div className="text-[--tg-theme-hint-color] text-xs mt-1">
                    {format.number(variant.price, 'currency')}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Spice Level */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-3">
            {t('Spice Level')}
          </Title>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(spiceLevelOptions).map(([key, option]) => (
              <button
                key={key}
                className={`p-3 rounded-lg border transition-colors text-center ${
                  selectedSpiceLevel === key
                    ? 'border-[--tg-theme-link-color] bg-[--tg-theme-link-color]/10'
                    : 'border-[--tg-theme-separator-color] hover:bg-[--tg-theme-secondary-bg-color]'
                }`}
                onClick={() => setSelectedSpiceLevel(key as SpiceLevel)}
              >
                <div className="text-[--tg-theme-text-color] font-medium text-sm">
                  {option.label}
                </div>
                {option.emoji && (
                  <div className="text-lg mt-1">{option.emoji}</div>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Quantity and Add to Cart */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <Button
              mode="outline"
              size="l"
              disabled={quantity <= 1}
              onClick={() => handleQuantityChange(-1)}
            >
              <Minus className="w-5 h-5" />
            </Button>
            
            <div className="px-6 py-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
              <Title level="2" className="text-[--tg-theme-text-color]">
                {quantity}
              </Title>
            </div>
            
            <Button
              mode="outline"
              size="l"
              disabled={quantity >= 10}
              onClick={() => handleQuantityChange(1)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <Button
            mode="filled"
            size="l"
            stretched
            disabled={!item.isAvailable || !selectedVariant?.isAvailable}
            onClick={handleAddToCart}
          >
            {!item.isAvailable ? (
              t('Out of Stock')
            ) : !selectedVariant?.isAvailable ? (
              t('Size Not Available')
            ) : (
              `${t('Add to Cart')} • ${format.number(totalPrice, 'currency')}`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
