'use client';

import { 
  Modal,
  Button,
  Title,
  Caption,
  Card,
  Placeholder,
  Input
} from '@telegram-apps/telegram-ui';
import { Minus, Plus, Trash2, ShoppingBag, Clock } from 'lucide-react';
import { useCartStore, useRestaurantStore, useUIStore, useAuthStore } from '@/store';
import { useCreateOrder } from '@/lib/api';
import { formatPrice, getSpiceLevelText, getSizeText } from '@dine-now/shared';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, totalAmount, estimatedTime, updateItem, removeItem, clearCart, getCartSummary } = useCartStore();
  const { currentTable } = useRestaurantStore();
  const { language } = useUIStore();
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [orderNotes, setOrderNotes] = useState('');
  const createOrder = useCreateOrder();
  const cartSummary = getCartSummary();

  const handleQuantityChange = (index: number, delta: number) => {
    const item = items[index];
    const newQuantity = Math.max(1, item.quantity + delta);
    
    if (newQuantity !== item.quantity) {
      updateItem(index, { quantity: newQuantity });
    }
  };

  const handleRemoveItem = (index: number) => {
    removeItem(index);
  };

  const handlePlaceOrder = async () => {
    if (!currentTable || !user || items.length === 0) {
      return;
    }

    try {
      const orderData = {
        tableId: currentTable.id,
        orderItems: items.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          size: item.size,
          spiceLevel: item.spiceLevel,
          notes: item.notes,
        })),
        notes: orderNotes.trim() || undefined,
      };

      const response = await createOrder.mutateAsync(orderData);
      
      // Clear cart and close drawer
      clearCart();
      onClose();
      
      // Navigate to order tracking
      router.push(`/order/${response.data.data.order.id}`);
    } catch (error) {
      console.error('Order placement failed:', error);
    }
  };

  const getItemName = (item: any) => {
    if (language === 'km' && item.menuItem.nameKh) {
      return item.menuItem.nameKh;
    }
    return item.menuItem.name;
  };

  if (items.length === 0) {
    return (
      <Modal open={isOpen} onOpenChange={onClose}>
        <div className="p-6">
          <Placeholder
            header={language === 'km' ? 'ការ៉ុតទទេ' : 'Your cart is empty'}
            description={language === 'km' ? 'បន្ថែមម្ហូបមួយចំនួនដើម្បីចាប់ផ្តើម' : 'Add some delicious items to get started'}
          >
            <ShoppingBag className="w-12 h-12 text-[--tg-theme-hint-color]" />
          </Placeholder>
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
        <div className="flex items-center justify-between">
          <Title level="2" className="text-[--tg-theme-text-color]">
            {language === 'km' ? 'ការ៉ុតរបស់អ្នក' : 'Your Cart'}
          </Title>
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            {cartSummary.totalItems} {language === 'km' ? 'វត្ថុ' : 'items'}
          </Caption>
        </div>

        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Title level="3" className="text-[--tg-theme-text-color] mb-1">
                      {getItemName(item)}
                    </Title>
                    
                    <div className="space-y-1">
                      {item.size && item.size !== 'medium' && (
                        <Caption level="1" className="text-[--tg-theme-hint-color]">
                          {language === 'km' ? 'ទំហំ: ' : 'Size: '}
                          {getSizeText(item.size)}
                        </Caption>
                      )}
                      
                      {item.spiceLevel && item.spiceLevel !== 'none' && (
                        <Caption level="1" className="text-[--tg-theme-hint-color]">
                          {language === 'km' ? 'កម្រិតហឹរ: ' : 'Spice: '}
                          {getSpiceLevelText(item.spiceLevel)}
                        </Caption>
                      )}
                      
                      {item.notes && (
                        <Caption level="1" className="text-[--tg-theme-hint-color] italic">
                          {item.notes}
                        </Caption>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    mode="plain"
                    size="s"
                    onClick={() => handleRemoveItem(index)}
                    className="text-[--tg-theme-destructive-text-color]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      mode="outline"
                      size="s"
                      disabled={item.quantity <= 1}
                      onClick={() => handleQuantityChange(index, -1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    
                    <span className="text-[--tg-theme-text-color] font-medium min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    
                    <Button
                      mode="outline"
                      size="s"
                      disabled={item.quantity >= 10}
                      onClick={() => handleQuantityChange(index, 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Title level="3" className="text-[--tg-theme-link-color]">
                    {formatPrice(item.subtotal)}
                  </Title>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Order Notes */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-3">
            {language === 'km' ? 'កំណត់ចំណាំការបញ្ជាទិញ' : 'Order Notes'}
          </Title>
          <Input
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder={
              language === 'km' 
                ? 'បន្ថែមកំណត់ចំណាំសម្រាប់ការបញ្ជាទិញ...'
                : 'Add notes for your order...'
            }
            maxLength={500}
          />
        </Card>

        {/* Order Summary */}
        <Card className="p-4 bg-[--tg-theme-secondary-bg-color]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Caption level="1" className="text-[--tg-theme-hint-color]">
                {language === 'km' ? 'រាយការបាន' : 'Subtotal'}
              </Caption>
              <Caption level="1" className="text-[--tg-theme-text-color]">
                {formatPrice(totalAmount)}
              </Caption>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-[--tg-theme-hint-color]" />
                <Caption level="1" className="text-[--tg-theme-hint-color]">
                  {language === 'km' ? 'ពេលវេលាប្រក់ព័ន្ធ' : 'Est. Time'}
                </Caption>
              </div>
              <Caption level="1" className="text-[--tg-theme-text-color]">
                ~{estimatedTime} {language === 'km' ? 'នាទី' : 'min'}
              </Caption>
            </div>
            
            <div className="border-t border-[--tg-theme-separator-color] pt-3">
              <div className="flex items-center justify-between">
                <Title level="3" className="text-[--tg-theme-text-color]">
                  {language === 'km' ? 'សរុប' : 'Total'}
                </Title>
                <Title level="2" className="text-[--tg-theme-link-color]">
                  {formatPrice(totalAmount)}
                </Title>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            mode="filled"
            size="l"
            stretched
            loading={createOrder.isPending}
            disabled={!currentTable || items.length === 0}
            onClick={handlePlaceOrder}
          >
            {language === 'km' ? 'ដាក់ការបញ្ជាទិញ' : 'Place Order'} • {formatPrice(totalAmount)}
          </Button>
          
          <Button
            mode="outline"
            size="l"
            stretched
            onClick={onClose}
          >
            {language === 'km' ? 'បន្តការទិញឥវ៉ាន់' : 'Continue Shopping'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
