'use client';

import { useState } from 'react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { 
  Modal,
  Button,
  Title,
  Subheadline,
  Caption,
  Input,
  Select,
  Card
} from '@telegram-apps/telegram-ui';
import { Minus, Plus, Clock, X } from 'lucide-react';
import { MenuItem, MenuItemVariant, SpiceLevel } from '@dine-now/shared';
import { useCartStore } from '@/store';
import { getDefaultVariant, getVariantPrice, formatVariantName, getSizeDisplayName } from '@/lib/api';
import toast from 'react-hot-toast';

interface MenuItemModalProps {
  item: MenuItem & { variants: MenuItemVariant[]; defaultVariant?: MenuItemVariant };
  isOpen: boolean;
  onClose: () => void;
}

export function MenuItemModal({ item, isOpen, onClose }: MenuItemModalProps) {
  const t = useTranslations('MenuItemModal');
  const locale = useLocale();
  const format = useFormatter();
  
  // Initialize with default variant
  const defaultVariant = getDefaultVariant(item) || item.variants?.[0];
  
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(defaultVariant);
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<SpiceLevel>(SpiceLevel.NONE);
  const [notes, setNotes] = useState('');
  
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

  const currentPrice = selectedVariant ? getVariantPrice(selectedVariant) : 0;
  const totalPrice = currentPrice * quantity;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(10, quantity + delta));
    setQuantity(newQuantity);
  };

  const handleVariantChange = (variantId: string) => {
    const variant = item.variants?.find(v => v.id === variantId);
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
      notes: notes.trim() || undefined,
    });

    toast.success(
      `${t('Added')} ${getItemName()} ${t('to cart')}`
    );
    onClose();
  };

  const spiceLevelOptions = [
    { value: SpiceLevel.NONE, label: t('No Spice') },
    { value: SpiceLevel.REGULAR, label: t('Regular') },
    { value: SpiceLevel.SPICY, label: t('Spicy') },
    { value: SpiceLevel.VERY_SPICY, label: t('Very Spicy') },
  ];

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
            {format.number(currentPrice, 'currency')}
          </Title>
        </div>

        {/* Size/Variant Selection */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-3">
            {t('Size')}
          </Title>
          <div className="space-y-2">
            {item.variants.map((variant) => (
              <button
                key={variant.id}
                disabled={!variant.isAvailable}
                className={`w-full p-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedVariant?.id === variant.id
                    ? 'border-[--tg-theme-link-color] bg-[--tg-theme-link-color]/10'
                    : 'border-[--tg-theme-separator-color] hover:bg-[--tg-theme-secondary-bg-color]'
                }`}
                onClick={() => handleVariantChange(variant.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[--tg-theme-text-color] font-medium">
                      {formatVariantName(variant, locale) || getSizeDisplayName(variant.size, locale)}
                    </span>
                    {variant.isDefault && (
                      <Badge className="text-xs bg-[--tg-theme-link-color] text-white px-2 py-1 rounded">
                        {t('Default')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[--tg-theme-hint-color]">
                    {format.number(getVariantPrice(variant), 'currency')}
                  </span>
                </div>
                {!variant.isAvailable && (
                  <div className="text-left mt-1">
                    <Caption level="1" className="text-[--tg-theme-destructive-text-color]">
                      {t('Not Available')}
                    </Caption>
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Spice Level */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-3">
            {t('Spice Level')}
          </Title>
          <Select
            value={selectedSpiceLevel}
            onChange={(e) => {
              setSelectedSpiceLevel(e.target.value as SpiceLevel);
            }}
          >
            {spiceLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Card>

        {/* Special Notes */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-3">
            {t('Notes')}
          </Title>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('Add notes to kitchen...')}
            maxLength={200}
          />
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

// Helper Badge component since it might not be available in telegram-ui
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={className}>
      {children}
    </span>
  );
}
