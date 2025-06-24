'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations, useFormatter } from 'next-intl';
import { 
  Card, 
  Title, 
  Subheadline, 
  Caption, 
  Input,
  Button,
  Spinner,
  Placeholder,
  Chip,
  Badge
} from '@telegram-apps/telegram-ui';
import { Search, Clock, Filter, X, Plus } from 'lucide-react';
import { useMenu } from '@/lib/api';
import { useRestaurantStore } from '@/store';
import { MenuCategory, MenuItem } from '@dine-now/shared';
import { MenuItemModal } from '@/components/MenuItemModal';
import { Page } from '@/components/Page';

export default function SearchPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('SearchPage');
  const { currentRestaurant } = useRestaurantStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: menuResponse, isLoading } = useMenu(currentRestaurant?.id || '');
  const menuData = useMemo(() => {
    return menuResponse?.data?.data || [];
  }, [menuResponse]);

  // Extract all items and categories
  const { allItems, categories } = useMemo(() => {
    const items: any[] = [];
    const cats: any[] = [];
    
    menuData.forEach((group: { category: MenuCategory, items: MenuItem[] }) => {
      cats.push(group.category);
      if (group.items) {
        items.push(...group.items);
      }
    });
    
    return { allItems: items, categories: cats };
  }, [menuData]);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    let items = allItems;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const name = (locale === 'km' && item.nameKh ? item.nameKh : item.name).toLowerCase();
        const description = (locale === 'km' && item.descriptionKh ? item.descriptionKh : item.description || '').toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }

    // Category filter
    if (selectedCategory) {
      items = items.filter(item => item.categoryId === selectedCategory);
    }

    // Price filter
    if (priceRange) {
      items = items.filter(item => {
        const price = parseFloat(item.price);
        return price >= priceRange.min && price <= priceRange.max;
      });
    }

    // Only available items
    items = items.filter(item => item.isAvailable);

    return items;
  }, [allItems, searchQuery, selectedCategory, priceRange, locale]);

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

  const getCategoryName = (category: MenuCategory) => {
    if (locale === 'km' && category.nameKh) {
      return category.nameKh;
    }
    return category.name;
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setPriceRange(null);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory || priceRange || searchQuery.trim();

  if (!currentRestaurant) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={t('No Restaurant Selected')}
            description={t('Please select a restaurant first')}
          >
            <Button mode="filled" onClick={() => router.push('/')}>
              {t('Select Restaurant')}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="min-h-screen bg-[--tg-theme-bg-color] pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-[--tg-theme-bg-color] border-b border-[--tg-theme-separator-color] p-4 z-10">
          <Title level="1" className="text-center text-[--tg-theme-text-color] mb-4">
            {t('Search Menu')}
          </Title>
          
          {/* Search Input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--tg-theme-hint-color]" />
            <Input
              placeholder={t('Search for dishes...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Button */}
          <div className="flex items-center justify-between">
            <Button
              mode="outline"
              size="s"
              onClick={() => {
                setShowFilters(!showFilters);
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('Filters')}
              {hasActiveFilters && (
                <Badge type='dot' mode="critical" className="ml-2 min-w-[6px] h-[6px]" />
              )}
            </Button>
            
            {hasActiveFilters && (
              <Button mode="plain" size="s" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                {t('Clear')}
              </Button>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 space-y-3 p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
              {/* Categories */}
              <div>
                <Caption level="1" className="text-[--tg-theme-hint-color] mb-2">
                  {t('Categories')}
                </Caption>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <Chip
                      key={category.id}
                      mode={selectedCategory === category.id ? 'elevated' : 'outline'}
                      onClick={() => {
                        setSelectedCategory(selectedCategory === category.id ? '' : category.id);
                      }}
                    >
                      {getCategoryName(category)}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <Caption level="1" className="text-[--tg-theme-hint-color] mb-2">
                  {t('Price Range')}
                </Caption>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: t('Under $5'), min: 0, max: 5 },
                    { label: t('$5 - $10'), min: 5, max: 10 },
                    { label: t('$10 - $20'), min: 10, max: 20 },
                    { label: t('Over $20'), min: 20, max: 1000 },
                  ].map(range => (
                    <Chip
                      key={`${range.min}-${range.max}`}
                      mode={priceRange?.min === range.min && priceRange?.max === range.max ? 'elevated' : 'outline'}
                      onClick={() => {
                        setPriceRange(
                          priceRange?.min === range.min && priceRange?.max === range.max 
                            ? null 
                            : { min: range.min, max: range.max }
                        );
                      }}
                    >
                      {range.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="l" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Placeholder
              header={t('No Results Found')}
              description={
                searchQuery.trim() || hasActiveFilters
                  ? t('Try adjusting your search or filters')
                  : t('Search for dishes you want to order')
              }
            >
              <Search className="w-12 h-12 text-[--tg-theme-hint-color]" />
            </Placeholder>
          ) : (
            <>
              <Caption level="1" className="text-[--tg-theme-hint-color] mb-4">
                {filteredItems.length} {t('results found')}
              </Caption>
              
              <div className="space-y-3">
                {filteredItems.map(item => (
                  <SearchResultCard
                    key={item.id}
                    item={item}
                    onSelect={() => setSelectedItem(item)}
                    getItemName={getItemName}
                    getItemDescription={getItemDescription}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Menu Item Modal */}
        {selectedItem && (
          <MenuItemModal
            item={selectedItem}
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    </Page>
  );
}

// Search Result Card Component
interface SearchResultCardProps {
  item: MenuItem;
  onSelect: () => void;
  getItemName: (item: any) => string;
  getItemDescription: (item: any) => string | undefined;
}

function SearchResultCard({ 
  item, 
  onSelect, 
  getItemName, 
  getItemDescription,
}: SearchResultCardProps) {
  const t = useTranslations('SearchPage');
  const format = useFormatter();

  return (
    <Card className="cursor-pointer" onClick={onSelect}>
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
                <div className="flex items-center space-x-1 text-[--tg-theme-hint-color]">
                  <Clock className="w-4 h-4" />
                  <Caption level="1">
                    {item.preparationTimeMinutes} {t('min')}
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
      </div>
    </Card>
  );
}
