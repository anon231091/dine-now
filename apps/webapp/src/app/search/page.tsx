'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { useMenu } from '../../lib/api';
import { useRestaurantStore, useUIStore, useCartStore } from '../../store';
import { useTelegram } from '../../providers/TelegramProvider';
import { formatPrice } from '@dine-now/shared';
import { MenuItemModal } from '../../components/MenuItemModal';

export default function SearchPage() {
  const router = useRouter();
  const { currentRestaurant } = useRestaurantStore();
  const { language } = useUIStore();
  const { showBackButton, hideBackButton, impactHaptic } = useTelegram();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: menuResponse, isLoading } = useMenu(currentRestaurant?.id || '');
  const menuData = menuResponse?.data?.data || [];

  // Setup back button
  useEffect(() => {
    showBackButton(() => {
      impactHaptic('light');
      router.back();
    });

    return () => hideBackButton();
  }, [showBackButton, hideBackButton, router, impactHaptic]);

  // Extract all items and categories
  const { allItems, categories } = useMemo(() => {
    const items: any[] = [];
    const cats: any[] = [];
    
    menuData.forEach(group => {
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
        const name = (language === 'km' && item.nameKh ? item.nameKh : item.name).toLowerCase();
        const description = (language === 'km' && item.descriptionKh ? item.descriptionKh : item.description || '').toLowerCase();
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
  }, [allItems, searchQuery, selectedCategory, priceRange, language]);

  const getItemName = (item: any) => {
    if (language === 'km' && item.nameKh) {
      return item.nameKh;
    }
    return item.name;
  };

  const getItemDescription = (item: any) => {
    if (language === 'km' && item.descriptionKh) {
      return item.descriptionKh;
    }
    return item.description;
  };

  const getCategoryName = (category: any) => {
    if (language === 'km' && category.nameKh) {
      return category.nameKh;
    }
    return category.name;
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setPriceRange(null);
    setSearchQuery('');
    impactHaptic('light');
  };

  const hasActiveFilters = selectedCategory || priceRange || searchQuery.trim();

  if (!currentRestaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Placeholder
          header={language === 'km' ? 'មិនមានភោជនីយដ្ឋាន' : 'No Restaurant Selected'}
          description={language === 'km' ? 'សូមជ្រើសរើសភោជនីយដ្ឋានជាមុនសិន' : 'Please select a restaurant first'}
        >
          <Button mode="filled" onClick={() => router.push('/')}>
            {language === 'km' ? 'ជ្រើសរើសភោជនីយដ្ឋាន' : 'Select Restaurant'}
          </Button>
        </Placeholder>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--tg-theme-bg-color] pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-[--tg-theme-bg-color] border-b border-[--tg-theme-separator-color] p-4 z-10">
        <Title level="1" className="text-center text-[--tg-theme-text-color] mb-4">
          {language === 'km' ? 'ស្វែងរកម្ហូប' : 'Search Menu'}
        </Title>
        
        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--tg-theme-hint-color]" />
          <Input
            placeholder={language === 'km' ? 'ស្វែងរកម្ហូប...' : 'Search for dishes...'}
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
              impactHaptic('light');
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            {language === 'km' ? 'តម្រង' : 'Filters'}
            {hasActiveFilters && (
              <Badge mode="critical" className="ml-2 min-w-[6px] h-[6px]" />
            )}
          </Button>
          
          {hasActiveFilters && (
            <Button mode="plain" size="s" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              {language === 'km' ? 'លុបចោល' : 'Clear'}
            </Button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 space-y-3 p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
            {/* Categories */}
            <div>
              <Caption level="1" className="text-[--tg-theme-hint-color] mb-2">
                {language === 'km' ? 'ប្រភេទម្ហូប' : 'Categories'}
              </Caption>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <Chip
                    key={category.id}
                    mode={selectedCategory === category.id ? 'filled' : 'outline'}
                    onClick={() => {
                      setSelectedCategory(selectedCategory === category.id ? '' : category.id);
                      impactHaptic('light');
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
                {language === 'km' ? 'ជួរតម្លៃ' : 'Price Range'}
              </Caption>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: language === 'km' ? 'ក្រោម $5' : 'Under $5', min: 0, max: 5 },
                  { label: '$5 - $10', min: 5, max: 10 },
                  { label: '$10 - $20', min: 10, max: 20 },
                  { label: language === 'km' ? 'លើស $20' : 'Over $20', min: 20, max: 1000 },
                ].map(range => (
                  <Chip
                    key={`${range.min}-${range.max}`}
                    mode={priceRange?.min === range.min && priceRange?.max === range.max ? 'filled' : 'outline'}
                    onClick={() => {
                      setPriceRange(
                        priceRange?.min === range.min && priceRange?.max === range.max 
                          ? null 
                          : { min: range.min, max: range.max }
                      );
                      impactHaptic('light');
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
            icon={<Search className="w-12 h-12 text-[--tg-theme-hint-color]" />}
            header={language === 'km' ? 'រកមិនឃើញលទ្ធផល' : 'No Results Found'}
            description={
              searchQuery.trim() || hasActiveFilters
                ? language === 'km' 
                  ? 'ព្យាយាមផ្លាស់ប្តូរពាក្យស្វែងរក ឬតម្រង'
                  : 'Try adjusting your search or filters'
                : language === 'km'
                  ? 'ស្វែងរកម្ហូបដែលអ្នកចង់ទិញ'
                  : 'Search for dishes you want to order'
            }
          />
        ) : (
          <>
            <Caption level="1" className="text-[--tg-theme-hint-color] mb-4">
              {filteredItems.length} {language === 'km' ? 'លទ្ធផល' : 'results found'}
            </Caption>
            
            <div className="space-y-3">
              {filteredItems.map(item => (
                <SearchResultCard
                  key={item.id}
                  item={item}
                  onSelect={() => setSelectedItem(item)}
                  getItemName={getItemName}
                  getItemDescription={getItemDescription}
                  language={language}
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
          language={language}
        />
      )}
    </div>
  );
}

// Search Result Card Component
interface SearchResultCardProps {
  item: any;
  onSelect: () => void;
  getItemName: (item: any) => string;
  getItemDescription: (item: any) => string | undefined;
  language: 'en' | 'km';
}

function SearchResultCard({ 
  item, 
  onSelect, 
  getItemName, 
  getItemDescription,
  language 
}: SearchResultCardProps) {
  const { impactHaptic } = useTelegram();

  const handleSelect = () => {
    impactHaptic('light');
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
                  {formatPrice(parseFloat(item.price))}
                </Title>
                
                <div className="flex items-center space-x-1 text-[--tg-theme-hint-color]">
                  <Clock className="w-4 h-4" />
                  <Caption level="1">
                    {item.preparationTimeMinutes} {language === 'km' ? 'នាទី' : 'min'}
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
