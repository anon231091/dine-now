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
import { MenuItem, SpiceLevel, ItemSize, Currency } from '@dine-now/shared';
import { useCartStore } from '@/store';
import toast from 'react-hot-toast';

interface MenuItemModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
}

export function MenuItemModal({ item, isOpen, onClose }: MenuItemModalProps) {
  const t = useTranslations('MenuItemModal');
  const locale = useLocale();
  const format = useFormatter();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<ItemSize>(ItemSize.MEDIUM);
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

  const getSizePriceMultiplier = (size: ItemSize): number => {
    switch (size) {
      case 'small': return 0.8;
      case 'large': return 1.3;
      default: return 1;
    }
  };

  const finalPrice = item.price * getSizePriceMultiplier(selectedSize);
  const totalPrice = finalPrice * quantity;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(10, quantity + delta));
    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    if (!item.isAvailable) {
      toast.error(t('This item is out of stock'));
      return;
    }

    addItem({
      menuItem: { ...item, price: finalPrice },
      quantity,
      size: selectedSize,
      spiceLevel: selectedSpiceLevel,
      notes: notes.trim() || undefined,
    });

    toast.success(
      `{${t('Added')} ${getItemName()} ${t('to cart')}`
    );
    onClose();
  };

  const formatPrice = (amount: number, currency: Currency) => format.number(amount, {
    style: 'currency',
    currency,
  });

  const spiceLevelOptions = [
    { value: SpiceLevel.NONE, label: t('No Spice') },
    { value: SpiceLevel.MILD, label: t('Mild') },
    { value: SpiceLevel.MEDIUM, label: t('Medium') },
    { value: SpiceLevel.SPICY, label: t('Spicy') },
    { value: SpiceLevel.VERY_SPICY, label: t('Very Spicy') },
  ];

  const sizeOptions = [
    { value: ItemSize.SMALL, label: t('Small'), price: finalPrice * 0.8 },
    { value: ItemSize.MEDIUM, label: t('Medium'), price: finalPrice },
    { value: ItemSize.LARGE, label: t('Large'), price: finalPrice * 1.3 },
  ];

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
            {format.number(finalPrice, 'currency')}
          </Title>
        </div>

        {/* Size Selection */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-3">
            {t('Size')}
          </Title>
          <div className="space-y-2">
            {sizeOptions.map((size) => (
              <button
                key={size.value}
                className={`w-full p-3 rounded-lg border transition-colors ${
                  selectedSize === size.value
                    ? 'border-[--tg-theme-link-color] bg-[--tg-theme-link-color]/10'
                    : 'border-[--tg-theme-separator-color] hover:bg-[--tg-theme-secondary-bg-color]'
                }`}
                onClick={() => {
                  setSelectedSize(size.value as ItemSize);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[--tg-theme-text-color]">{size.label}</span>
                  <span className="text-[--tg-theme-hint-color]">
                    {format.number(size.price, 'currency')}
                  </span>
                </div>
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
            onChange={(value) => {
              setSelectedSpiceLevel(value.target.value as SpiceLevel);
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
            placeholder={
              t('Add notes to kitchen...')
            }
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
            disabled={!item.isAvailable}
            onClick={handleAddToCart}
          >
            {!item.isAvailable ? (
              t('Out of Stock')
            ) : (
              `${t('Add to Cart')} • ${format.number(totalPrice, 'currency')}`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
