'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { MenuItem, MenuCategory } from '@dine-now/shared';
import { MenuItemModal } from './MenuItemModal';
import { CartDrawer } from './CartDrawer';
import { formatPrice } from '@dine-now/shared';
import { Page } from './Page';

export function MenuView() {
  const { currentRestaurant } = useRestaurantStore();
  const { items: cartItems, getCartSummary } = useCartStore();
  const { language, showCart, toggleCart } = useUIStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
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
          text: `Order (${cartSummary.totalItems}) • ${formatPrice(cartSummary.totalAmount)}`,
          isVisible: true,
        });
      } else {
        mainButton.setParams({ isVisible: false });
      }
    }
  }, [cartSummary]);

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
    if (language === 'km' && category.nameKh) {
      return category.nameKh;
    }
    return category.name;
  };

  const getItemName = (item: MenuItem) => {
    if (language === 'km' && item.nameKh) {
      return item.nameKh;
    }
    return item.name;
  };

  const getItemDescription = (item: MenuItem) => {
    if (language === 'km' && item.descriptionKh) {
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
            <p className="mt-4 text-[--tg-theme-hint-color]">Loading menu...</p>
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
              {language === 'km' && currentRestaurant?.nameKh 
                ? currentRestaurant.nameKh 
                : currentRestaurant?.name}
            </Title>
            
            {kitchenStatus?.data?.data && (
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-[--tg-theme-hint-color]" />
                  <Caption level="1" className="text-[--tg-theme-hint-color]">
                    ~{kitchenStatus.data.data.estimatedWaitTime} min
                  </Caption>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Caption level="1" className="text-[--tg-theme-hint-color]">
                  {kitchenStatus.data.data.activeOrdersCount} orders in queue
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
          {currentCategoryItems.map((item: MenuItem) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onSelect={() => setSelectedItem(item)}
              language={language}
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
            language={language}
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
  item: MenuItem;
  onSelect: () => void;
  language: 'en' | 'km';
  getItemName: (item: MenuItem) => string;
  getItemDescription: (item: MenuItem) => string | undefined;
}

function MenuItemCard({ 
  item, 
  onSelect, 
  language,
  getItemName,
  getItemDescription 
}: MenuItemCardProps) {
  const handleSelect = () => {
    onSelect();
  };

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
                <Title level="3" className="text-[--tg-theme-link-color]">
                  {formatPrice(item.price)}
                </Title>
                
                <div className="flex items-center space-x-1 text-[--tg-theme-hint-color]">
                  <Clock className="w-4 h-4" />
                  <Caption level="1">
                    {item.preparationTimeMinutes} min
                  </Caption>
                </div>
              </div>
              
              <Button mode="outline" size="s">
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
        
        {!item.isAvailable && (
          <div className="mt-2">
            <Badge type='dot' mode="critical">
              {language === 'km' ? 'អស់ហើយ' : 'Out of Stock'}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
