'use client';

import { useState } from 'react';
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
import { MenuItem, SpiceLevel, ItemSize, formatPrice } from '@dine-now/shared';
import { useCartStore, useUIStore } from '../store';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface MenuItemModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'km';
}

export function MenuItemModal({ item, isOpen, onClose, language }: MenuItemModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<ItemSize>(ItemSize.MEDIUM);
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<SpiceLevel>(SpiceLevel.NONE);
  const [notes, setNotes] = useState('');
  
  const { addItem } = useCartStore();

  const getItemName = () => {
    if (language === 'km' && item.nameKh) {
      return item.nameKh;
    }
    return item.name;
  };

  const getItemDescription = () => {
    if (language === 'km' && item.descriptionKh) {
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
      toast.error(language === 'km' ? 'ម្ហូបនេះអស់ហើយ' : 'This item is out of stock');
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
      language === 'km' 
        ? `បានបន្ថែម ${getItemName()} ចូលក្នុងការ៉ុតហើយ`
        : `Added ${getItemName()} to cart`
    );
    onClose();
  };

  const spiceLevelOptions = [
    { value: SpiceLevel.NONE, label: language === 'km' ? 'មិនហឹរ' : 'No Spice' },
    { value: SpiceLevel.MILD, label: language === 'km' ? 'ហឹរបន្តិច' : 'Mild 🌶️' },
    { value: SpiceLevel.MEDIUM, label: language === 'km' ? 'ហឹរមធ្យម' : 'Medium 🌶️🌶️' },
    { value: SpiceLevel.SPICY, label: language === 'km' ? 'ហឹរ' : 'Spicy 🌶️🌶️🌶️' },
    { value: SpiceLevel.VERY_SPICY, label: language === 'km' ? 'ហឹរខ្លាំង' : 'Very Spicy 🌶️🌶️🌶️🌶️' },
  ];

  const sizeOptions = [
    { value: ItemSize.SMALL, label: language === 'km' ? 'តូច' : 'Small', price: finalPrice * 0.8 },
    { value: ItemSize.MEDIUM, label: language === 'km' ? 'មធ្យម' : 'Medium', price: finalPrice },
    { value: ItemSize.LARGE, label: language === 'km' ? 'ធំ' : 'Large', price: finalPrice * 1.3 },
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
            <Image 
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
              {item.preparationTimeMinutes} {language === 'km' ? 'នាទី' : 'min'}
            </Caption>
          </div>
          <Title level="3" className="text-[--tg-theme-link-color]">
            {formatPrice(finalPrice)}
          </Title>
        </div>

        {/* Size Selection */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-3">
            {language === 'km' ? 'ទំហំ' : 'Size'}
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
                    {formatPrice(size.price)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Spice Level */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-3">
            {language === 'km' ? 'កម្រិតហឹរ' : 'Spice Level'}
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
            {language === 'km' ? 'កំណត់ចំណាំ' : 'Special Notes'}
          </Title>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              language === 'km' 
                ? 'បន្ថែមកំណត់ចំណាំពិសេស...'
                : 'Add special instructions...'
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
              language === 'km' ? 'អស់ហើយ' : 'Out of Stock'
            ) : (
              `${language === 'km' ? 'បន្ថែមចូលការ៉ុត' : 'Add to Cart'} • ${formatPrice(totalPrice)}`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
