'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useUIStore } from '../../store';
import { formatPrice, getOrderStatusText } from '@dine-now/shared';
import { Page } from '@/components/Page';

export default function OrderHistoryPage() {
  const router = useRouter();
  const { language } = useUIStore();
  
  const [page, setPage] = useState(1);
  const { data: ordersResponse, isLoading, error } = useOrderHistory({ page, limit: 10 });
  const orders = ordersResponse?.data?.data || [];

  const handleOrderClick = (orderId: string) => {
    router.push(`/order/${orderId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Phnom_Penh',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Phnom_Penh',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'primary';
      case 'preparing': return 'warning';
      case 'ready': return 'primary';
      case 'served': return 'primary';
      case 'cancelled': return 'critical';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">
              {language === 'km' ? 'កំពុងផ្ទុកប្រវត្តិការបញ្ជាទិញ...' : 'Loading order history...'}
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={language === 'km' ? 'មានបញ្ហាកើតឡើង' : 'Something went wrong'}
            description={language === 'km' ? 'មិនអាចផ្ទុកប្រវត្តិការបញ្ជាទិញបានទេ' : 'Unable to load order history'}
          >
            <Button mode="filled" onClick={() => window.location.reload()}>
              {language === 'km' ? 'ព្យាយាមម្តងទៀត' : 'Try Again'}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  if (orders.length === 0) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={language === 'km' ? 'មិនមានការបញ្ជាទិញ' : 'No Orders Yet'}
            description={language === 'km' ? 'អ្នកមិនទាន់មានការបញ្ជាទិញណាមួយទេ' : "You haven't placed any orders yet"}
          >
            <Receipt className="w-12 h-12 text-[--tg-theme-hint-color]" />
          </Placeholder>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="min-h-screen bg-[--tg-theme-bg-color]">
        {/* Header */}
        <div className="sticky top-0 bg-[--tg-theme-bg-color] border-b border-[--tg-theme-separator-color] p-4 z-10">
          <Title level="1" className="text-center text-[--tg-theme-text-color]">
            {language === 'km' ? 'ប្រវត្តិការបញ្ជាទិញ' : 'Order History'}
          </Title>
        </div>

        {/* Orders List */}
        <div className="p-4 space-y-3">
          {orders.map((order: any) => (
            <OrderCard
              key={order.order.id}
              order={order}
              language={language}
              onOrderClick={handleOrderClick}
              formatDate={formatDate}
              formatTime={formatTime}
              getStatusColor={getStatusColor}
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
              {language === 'km' ? 'ផ្ទុកបន្ថែម' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </Page>
  );
}

// Order Card Component
interface OrderCardProps {
  order: any;
  language: 'en' | 'km';
  onOrderClick: (orderId: string) => void;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
  getStatusColor: (status: string) => string;
}

function OrderCard({ 
  order, 
  language, 
  onOrderClick, 
  formatDate, 
  formatTime, 
  getStatusColor 
}: OrderCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:bg-[--tg-theme-secondary-bg-color] transition-colors"
      onClick={() => onOrderClick(order.order.id)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Title level="3" className="text-[--tg-theme-text-color]">
                #{order.order.orderNumber}
              </Title>
              <Badge type='dot' mode={getStatusColor(order.order.status) as any}>
                {getOrderStatusText(order.order.status)}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-[--tg-theme-hint-color]" />
                <Caption level="1" className="text-[--tg-theme-hint-color]">
                  {formatDate(order.order.createdAt)} • {formatTime(order.order.createdAt)}
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
            {order.restaurant?.name}
          </Subheadline>
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            • {language === 'km' ? 'តុ' : 'Table'} {order.table?.number}
          </Caption>
        </div>

        {/* Order Summary */}
        <div className="flex items-center justify-between">
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            {order.order.orderItems?.length || 0} {language === 'km' ? 'ម្ហូប' : 'items'}
          </Caption>
          <Title level="3" className="text-[--tg-theme-link-color]">
            {formatPrice(parseFloat(order.order.totalAmount))}
          </Title>
        </div>
      </div>
    </Card>
  );
}
