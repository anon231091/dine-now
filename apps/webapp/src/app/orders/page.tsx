'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { 
  Card, 
  Title, 
  Subheadline, 
  Caption, 
  Button,
  Badge,
  Spinner,
  Placeholder,
} from '@telegram-apps/telegram-ui';
import { Clock, MapPin, Receipt, ArrowRight } from 'lucide-react';
import { useOrderHistory } from '../../lib/api';
import { OrderWithInfo } from '@dine-now/shared';
import { getStatusColor } from '@/helpers';

export default function OrderHistoryPage() {
  const router = useRouter();
  const t = useTranslations('OrderHistoryPage');
  
  const [page, setPage] = useState(1);
  const { data: ordersResponse, isLoading, error } = useOrderHistory({ page, limit: 10 });
  const orders = ordersResponse?.data?.data || [];

  const handleOrderClick = (orderId: string) => {
    router.push(`/order/${orderId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="l" />
          <p className="mt-4 text-[--tg-theme-hint-color]">
            {t('Loading order history')}...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Placeholder
          header={t('Something went wrong')}
          description={t('Unable to load order history')}
        >
          <Button mode="filled" onClick={() => router.refresh()}>
            {t('Try Again')}
          </Button>
        </Placeholder>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Placeholder
          header={t('No Orders Yet')}
          description={t("You haven't placed any orders yet")}
        >
          <Receipt className="w-12 h-12 text-[--tg-theme-hint-color]" />
        </Placeholder>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--tg-theme-bg-color]">
      {/* Header */}
      <div className="sticky top-0 bg-[--tg-theme-bg-color] border-b border-[--tg-theme-separator-color] p-4 z-10">
        <Title level="1" className="text-center text-[--tg-theme-text-color]">
          {t('Order History')}
        </Title>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-3">
        {orders.map((order: any) => (
          <OrderCard
            key={order.order.id}
            order={order}
            onOrderClick={handleOrderClick}
          />
        ))}
      </div>

      {/* Load More Button */}
      {orders.length >= 10 && (
        <div className="p-4">
          <Button
            mode="outline"
            size="l"
            stretched
            onClick={() => setPage(page + 1)}
          >
            {t('Load More')}
          </Button>
        </div>
      )}
    </div>
  );
}

// Order Card Component
interface OrderCardProps {
  order: OrderWithInfo;
  onOrderClick: (orderId: string) => void;
}

function OrderCard({ 
  order: { restaurant, ...order }, 
  onOrderClick,
}: OrderCardProps) {
  const t = useTranslations('OrderHistoryPage');
  const format = useFormatter();

  return (
    <Card 
      className="cursor-pointer hover:bg-[--tg-theme-secondary-bg-color] transition-colors"
      onClick={() => onOrderClick(order.id)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Title level="3" className="text-[--tg-theme-text-color]">
                #{order.orderNumber}
              </Title>
              <Badge type='dot' mode={getStatusColor(order.status) as any}>
                {order.status}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-[--tg-theme-hint-color]" />
                <Caption level="1" className="text-[--tg-theme-hint-color]">
                  {format.dateTime(order.createdAt, 'datetime')}
                </Caption>
              </div>
            </div>
          </div>
          
          <ArrowRight className="w-5 h-5 text-[--tg-theme-hint-color]" />
        </div>

        {/* Restaurant Info */}
        <div className="flex items-center space-x-2 mb-3">
          <MapPin className="w-4 h-4 text-[--tg-theme-hint-color]" />
          <Subheadline level="2" className="text-[--tg-theme-text-color]">
            {restaurant.name}
          </Subheadline>
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            • {t('Table Number')} {order.table.number}
          </Caption>
        </div>

        {/* Order Summary */}
        <div className="flex items-center justify-between">
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            {order.orderNumber}
          </Caption>
          <Title level="3" className="text-[--tg-theme-link-color]">
            {format.number(order.totalAmount, 'currency')}
          </Title>
        </div>
      </div>
    </Card>
  );
}
