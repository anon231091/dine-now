'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { 
  Title, 
  Subheadline, 
  Caption,
  Button,
  Badge,
  Spinner,
  Placeholder,
} from '@telegram-apps/telegram-ui';
import { mainButton } from '@telegram-apps/sdk-react';
import { Plus, Clock, Users } from 'lucide-react';
import { useMenu, useKitchenStatus } from '@/lib/api';
import { useRestaurantStore, useCartStore } from '@/store';
import { MenuItem, MenuCategory, MenuItemVariant, MenuItemDetails } from '@dine-now/shared';
import { getDefaultVariant } from '@/helpers';
import { MenuItemModal } from './MenuItemModal';
import { CartModal } from './CartModal';
import { useCartMainButton } from '@/hooks/useMainButton';

export function MenuView() {
  const locale = useLocale();
  const t = useTranslations('MenuView');
  const format = useFormatter();
  const { currentRestaurant, currentTable } = useRestaurantStore();
  const { getCartSummary } = useCartStore();
  const { setCartButton, hideMainButton } = useCartMainButton();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<(MenuItemDetails & { defaultVariant?: MenuItemVariant }) | null>(null);
  const [showCart, setShowCart] = useState(false);
  
  const { data: menuResponse, isLoading } = useMenu(currentRestaurant?.id || '');
  const { data: kitchenStatus } = useKitchenStatus(currentRestaurant?.id || '');
  
  const cartSummary = getCartSummary();
  const menuData = useMemo(() => {
    return menuResponse?.data?.data || [];
  }, [menuResponse]);

  // Set up Telegram main button for cart
  useEffect(() => {
    if (cartSummary.totalItems > 0) {
      setCartButton({
        itemCount: cartSummary.totalItems,
        totalAmount: cartSummary.totalAmount,
        onViewCart: () => setShowCart(true),
        formatter: format
      });
    } else {
      hideMainButton();
    }
  }, [cartSummary, format]);

  // Set initial category
  useEffect(() => {
    if (menuData.length > 0 && !selectedCategory) {
      setSelectedCategory(menuData[0].category.id);
    }
  }, [menuData, selectedCategory]);

  const categories = menuData.map((group: { category: MenuCategory }) => group.category);
  const currentCategoryItems = menuData.find(
    (group: { category: MenuCategory }) => group.category.id === selectedCategory
  )?.items || [];

  const getCategoryName = (category: MenuCategory) => {
    if (locale === 'km' && category.nameKh) {
      return category.nameKh;
    }
    return category.name;
  };

  const getItemName = (item: MenuItem) => {
    if (locale === 'km' && item.nameKh) {
      return item.nameKh;
    }
    return item.name;
  };

  const getItemDescription = (item: MenuItem) => {
    if (locale === 'km' && item.descriptionKh) {
      return item.descriptionKh;
    }
    return item.description;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="l" />
          <p className="mt-4 text-[--tg-theme-hint-color]">{t('Loading menu')}...</p>
        </div>
      </div>
    );
  }

  if (menuData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Placeholder
          header="Menu Not Available"
          description="This restaurant's menu is currently unavailable. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--tg-theme-bg-color]">
      {/* Restaurant Header - Similar to Physical Menu */}
      <div className="bg-[--tg-theme-bg-color] border-b border-[--tg-theme-separator-color] p-4">
        <div className="text-center mb-3">
          <Title level="1" className="text-[--tg-theme-text-color] mb-1">
            {locale === 'km' && currentRestaurant?.nameKh 
              ? currentRestaurant.nameKh 
              : currentRestaurant?.name}
          </Title>
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            {t('Table')} {currentTable?.number}
          </Caption>
        </div>
        
        {/* Kitchen Status */}
        {kitchenStatus?.data?.data && (
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-[--tg-theme-hint-color]" />
              <Caption level="1" className="text-[--tg-theme-hint-color]">
                ~{kitchenStatus.data.data.estimatedWaitTime} {t('mins')}
              </Caption>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-[--tg-theme-hint-color]" />
              <Caption level="1" className="text-[--tg-theme-hint-color]">
                {kitchenStatus.data.data.activeOrdersCount} {t('orders ahead')}
              </Caption>
            </div>
          </div>
        )}
      </div>

      {/* Category Navigation - Horizontal Scroll */}
      <div className="bg-[--tg-theme-secondary-bg-color] border-b border-[--tg-theme-separator-color]">
        <div className="flex overflow-x-auto p-2 space-x-2">
          {categories.map((category: MenuCategory) => (
            <button
              key={category.id}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-[--tg-theme-link-color] text-[--tg-theme-button-text-color]'
                  : 'bg-[--tg-theme-bg-color] text-[--tg-theme-text-color] border border-[--tg-theme-separator-color]'
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {getCategoryName(category)}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items - Physical Menu Style */}
      <div className="p-4">
        <div className="space-y-1">
          {currentCategoryItems.map((item: MenuItem & { variants: MenuItemVariant[] }) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onSelect={() => setSelectedItem(item)}
              getItemName={getItemName}
              getItemDescription={getItemDescription}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {selectedItem && (
        <MenuItemModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      <CartModal 
        isOpen={showCart} 
        onClose={() => setShowCart(false)} 
      />
    </div>
  );
}

interface MenuItemCardProps {
  item: MenuItemDetails;
  onSelect: () => void;
  getItemName: (item: MenuItem) => string;
  getItemDescription: (item: MenuItem) => string | undefined;
}

function MenuItemCard({ 
  item, 
  onSelect, 
  getItemName,
  getItemDescription 
}: MenuItemCardProps) {
  const t = useTranslations('MenuView');
  const format = useFormatter();
  
  // Get default variant for display
  const defaultVariant = getDefaultVariant(item);
  const displayPrice = defaultVariant.price;
  
  // Get price range if there are multiple variants
  const priceRange = useMemo(() => {
    if (!item.variants || item.variants.length <= 1) return null;
    
    const prices = item.variants
      .filter(v => v.isAvailable)
      .map(v => v.price)
      .sort((a, b) => a - b);
    
    if (prices.length === 0) return null;
    if (prices[0] === prices[prices.length - 1]) return null;
    
    return {
      min: prices[0],
      max: prices[prices.length - 1]
    };
  }, [item.variants]);

  const availableVariants = item.variants?.filter(v => v.isAvailable) || [];
  const hasAvailableVariants = availableVariants.length > 0;

  return (
    <div
      className="flex items-start justify-between py-3 border-b border-[--tg-theme-separator-color] last:border-b-0 cursor-pointer hover:bg-[--tg-theme-secondary-bg-color] transition-colors rounded-lg px-2"
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-start justify-between mb-1">
          <Title level="3" className="text-[--tg-theme-text-color] leading-tight">
            {getItemName(item)}
          </Title>
          <div className="text-right ml-2">
            <Title level="3" className="text-[--tg-theme-link-color]">
              {priceRange ? (
                `${format.number(priceRange.min, 'currency')} - ${format.number(priceRange.max, 'currency')}`
              ) : (
                format.number(displayPrice, 'currency')
              )}
            </Title>
          </div>
        </div>
        
        {getItemDescription(item) && (
          <Subheadline 
            level="2" 
            className="text-[--tg-theme-hint-color] text-sm mb-2 line-clamp-2"
          >
            {getItemDescription(item)}
          </Subheadline>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-[--tg-theme-hint-color]">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{item.preparationTimeMinutes} {t('min')}</span>
            </div>
            
            {/* Show available sizes */}
            {item.variants && item.variants.length > 1 && (
              <span>• {availableVariants.map(v => t(v.size)).join(', ')}</span>
            )}
          </div>
          
          <Button 
            mode="outline" 
            size="s"
            disabled={!item.isAvailable || !hasAvailableVariants}
            className="ml-2"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {(!item.isAvailable || !hasAvailableVariants) && (
          <div className="mt-2">
            <Badge type='dot' mode="critical" className="text-xs">
              {!item.isAvailable ? t('Out of Stock') : t('No sizes available')}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
