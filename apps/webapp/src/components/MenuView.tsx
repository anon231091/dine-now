'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { 
  List, 
  Card, 
  Title, 
  Subheadline, 
  Caption,
  Button,
  Badge,
  Spinner,
  Placeholder,
  Tabbar,
} from '@telegram-apps/telegram-ui';
import { mainButton } from '@telegram-apps/sdk-react';
import { ShoppingCart, Plus, Clock, Search } from 'lucide-react';
import { useMenu, useKitchenStatus } from '@/lib/api';
import { useRestaurantStore, useCartStore, useUIStore } from '@/store';
import { MenuItem, MenuCategory, MenuItemVariant } from '@dine-now/shared';
import { getDefaultVariant, getVariantPrice, getSizeDisplayName } from '@/lib/api';
import { MenuItemModal } from './MenuItemModal';
import { CartDrawer } from './CartDrawer';
import { Page } from './Page';

export function MenuView() {
  const locale = useLocale();
  const t = useTranslations('MenuView');
  const format = useFormatter();
  const { currentRestaurant } = useRestaurantStore();
  const { items: cartItems, getCartSummary } = useCartStore();
  const { showCart, toggleCart } = useUIStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<(MenuItem & { variants: MenuItemVariant[]; defaultVariant?: MenuItemVariant }) | null>(null);
  
  const { data: menuResponse, isLoading } = useMenu(currentRestaurant?.id || '');
  const { data: kitchenStatus } = useKitchenStatus(currentRestaurant?.id || '');
  
  const cartSummary = getCartSummary();
  const menuData = useMemo(() => {
    return menuResponse?.data?.data || [];
  }, [menuResponse]);

  // Set up Telegram main button for cart
  useEffect(() => {
    if (mainButton.setParams.isAvailable()) {
      if (cartSummary.totalItems > 0) {
        mainButton.setParams({
          text: `${t('Order')} (${cartSummary.totalItems}) • ${format.number(cartSummary.totalAmount, 'currency')}`,
          isVisible: true,
        });
      } else {
        mainButton.setParams({ isVisible: false });
      }
    }
  }, [cartSummary, t, format]);

  useEffect(() => {
    if (mainButton.onClick.isAvailable()) {
      return mainButton.onClick(toggleCart);
    }
  }, [toggleCart])

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
      <Page back={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">{t('Loading menu')}...</p>
          </div>
        </div>
      </Page>
    );
  }

  if (menuData.length === 0) {
    return (
      <Page back={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header="Menu Not Available"
            description="This restaurant's menu is currently unavailable. Please try again later."
          />
        </div>
      </Page>
    );
  }

  return (
    <Page back={false}>
      <div className="min-h-screen bg-[--tg-theme-bg-color] pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-[--tg-theme-bg-color] border-b border-[--tg-theme-separator-color] z-10">
          <div className="p-4">
            <Title level="2" className="text-[--tg-theme-text-color]">
              {locale === 'km' && currentRestaurant?.nameKh 
                ? currentRestaurant.nameKh 
                : currentRestaurant?.name}
            </Title>
            
            {kitchenStatus?.data?.data && (
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-[--tg-theme-hint-color]" />
                  <Caption level="1" className="text-[--tg-theme-hint-color]">
                    ~{kitchenStatus.data.data.estimatedWaitTime} {t('mins')}
                  </Caption>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Caption level="1" className="text-[--tg-theme-hint-color]">
                  {kitchenStatus.data.data.activeOrdersCount} {t('orders in queue')}
                </Caption>
              </div>
            )}
          </div>

          {/* Category Tabs */}
          <div className="overflow-x-auto">
            <Tabbar className="flex-nowrap">
              {categories.map((category: MenuCategory) => (
                <Tabbar.Item
                  key={category.id}
                  text={getCategoryName(category)}
                  selected={selectedCategory === category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                  }}
                />
              ))}
            </Tabbar>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-3">
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

        {/* Cart Floating Button */}
        {cartSummary.totalItems > 0 && (
          <div className="fixed bottom-4 right-4 z-20">
            <Button
              mode="filled"
              size="l"
              className="rounded-full shadow-lg"
              onClick={() => {
                toggleCart();
              }}
            >
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <Badge type='number' mode="critical" className="min-w-[20px] h-5">
                  {cartSummary.totalItems}
                </Badge>
              </div>
            </Button>
          </div>
        )}

        {/* Modals */}
        {selectedItem && (
          <MenuItemModal
            item={selectedItem}
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}

        <CartDrawer 
          isOpen={showCart} 
          onClose={() => toggleCart()} 
        />
      </div>
    </Page>
  );
}

interface MenuItemCardProps {
  item: MenuItem & { variants: MenuItemVariant[] };
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
  const locale = useLocale();
  
  // Get default variant for display
  const defaultVariant = getDefaultVariant(item);
  const displayPrice = defaultVariant ? getVariantPrice(defaultVariant) : 0;
  
  // Get price range if there are multiple variants
  const priceRange = useMemo(() => {
    if (!item.variants || item.variants.length <= 1) return null;
    
    const prices = item.variants
      .filter(v => v.isAvailable)
      .map(v => getVariantPrice(v))
      .sort((a, b) => a - b);
    
    if (prices.length === 0) return null;
    if (prices[0] === prices[prices.length - 1]) return null;
    
    return {
      min: prices[0],
      max: prices[prices.length - 1]
    };
  }, [item.variants]);

  const handleSelect = () => {
    onSelect();
  };

  const availableVariants = item.variants?.filter(v => v.isAvailable) || [];
  const hasAvailableVariants = availableVariants.length > 0;

  return (
    <Card className="cursor-pointer" onClick={handleSelect}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Title level="3" className="text-[--tg-theme-text-color] mb-1">
              {getItemName(item)}
            </Title>
            
            {getItemDescription(item) && (
              <Subheadline 
                level="2" 
                className="text-[--tg-theme-hint-color] mb-2 line-clamp-2"
              >
                {getItemDescription(item)}
              </Subheadline>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <Title level="3" className="text-[--tg-theme-link-color]">
                    {priceRange ? (
                      `${format.number(priceRange.min, 'currency')} - ${format.number(priceRange.max, 'currency')}`
                    ) : (
                      format.number(displayPrice, 'currency')
                    )}
                  </Title>
                  
                  {/* Show available sizes */}
                  {item.variants && item.variants.length > 1 && (
                    <Caption level="1" className="text-[--tg-theme-hint-color] text-xs">
                      {availableVariants.map(v => getSizeDisplayName(v.size, locale)).join(', ')}
                    </Caption>
                  )}
                </div>
                
                <div className="flex items-center space-x-1 text-[--tg-theme-hint-color]">
                  <Clock className="w-4 h-4" />
                  <Caption level="1">
                    {item.preparationTimeMinutes} min
                  </Caption>
                </div>
              </div>
              
              <Button 
                mode="outline" 
                size="s"
                disabled={!item.isAvailable || !hasAvailableVariants}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {item.imageUrl && (
            <div className="ml-4 w-16 h-16 bg-[--tg-theme-secondary-bg-color] rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={item.imageUrl} 
                alt={getItemName(item)}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
        
        {(!item.isAvailable || !hasAvailableVariants) && (
          <div className="mt-2">
            <Badge type='dot' mode="critical">
              {!item.isAvailable ? t('Out of Stock') : t('No sizes available')}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
