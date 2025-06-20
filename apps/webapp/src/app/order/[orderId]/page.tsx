'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Subheadline, 
  Caption, 
  Button,
  Badge,
  Spinner,
  Placeholder,
  Snackbar
} from '@telegram-apps/telegram-ui';
import { Clock, MapPin, User, CheckCircle, AlertCircle, ArrowLeft, Bell } from 'lucide-react';
import { useOrder, useWebSocket } from '@/lib/api';
import { useUIStore, useWebSocketStore } from '@/store';
import { formatPrice, getOrderStatusText, getCambodiaTime, OrderStatus } from '@dine-now/shared';
import toast from 'react-hot-toast';
import { Page } from '@/components/Page';

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const { language } = useUIStore();
  const { messages, isConnected } = useWebSocketStore();
  const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderStatus | null>(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  const { data: orderResponse, isLoading, error, refetch } = useOrder(orderId);
  const order = orderResponse?.data?.data;
  
  // Initialize WebSocket for real-time updates
  useWebSocket();

  // Handle WebSocket messages for order updates
  useEffect(() => {
    if (!order) return;

    // Set initial status
    if (currentOrderStatus === null) {
      setCurrentOrderStatus(order.status);
    }

    // Listen for order updates
    const latestMessage = messages[messages.length - 1];
    if (
      latestMessage?.type === 'order_status_update' && 
      latestMessage.data.orderId === orderId
    ) {
      const newStatus = latestMessage.data.status;
      
      // Only update if status has changed
      if (newStatus !== currentOrderStatus) {
        setCurrentOrderStatus(newStatus);
        setLastUpdateTime(new Date());
        setShowStatusUpdate(true);
        
        // Show status update notification
        const statusText = getOrderStatusText(newStatus);
        toast.success(
          language === 'km' 
            ? `ស្ថានភាពបានផ្លាស់ប្តូរ: ${statusText}`
            : `Status updated: ${statusText}`,
          {
            icon: '🎉',
            duration: 5000,
          }
        );

        // Refetch order data to get latest information
        refetch();

        // Hide status update banner after 5 seconds
        setTimeout(() => setShowStatusUpdate(false), 5000);
      }
    }
  }, [messages, order, orderId, currentOrderStatus, language, refetch]);

  // Auto-refetch order periodically if not completed
  useEffect(() => {
    if (!order || order.status === 'served' || order.status === 'cancelled') return;

    const interval = setInterval(() => {
      refetch();
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(interval);
  }, [order, refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'confirmed': return 'text-blue-600';
      case 'preparing': return 'text-orange-600';
      case 'ready': return 'text-green-600';
      case 'served': return 'text-green-700';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5" />;
      case 'preparing': return <Clock className="w-5 h-5 animate-pulse" />;
      case 'ready': return <Bell className="w-5 h-5 animate-bounce" />;
      case 'served': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <AlertCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
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

  const getItemName = (item: any) => {
    if (language === 'km' && item.menuItem?.nameKh) {
      return item.menuItem.nameKh;
    }
    return item.menuItem?.name || 'Unknown Item';
  };

  const displayStatus = currentOrderStatus || order?.status || 'pending';

  if (isLoading) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">
              {language === 'km' ? 'កំពុងផ្ទុកការបញ្ជាទិញ...' : 'Loading order...'}
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (error || !order) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={language === 'km' ? 'រកមិនឃើញការបញ្ជាទិញ' : 'Order Not Found'}
            description={language === 'km' ? 'ការបញ្ជាទិញនេះមិនអាចរកឃើញទេ' : 'This order could not be found'}
          >
            <Button mode="filled" onClick={() => router.push('/')}>
              {language === 'km' ? 'ត្រលប់ទៅដើម' : 'Go Home'}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="min-h-screen bg-[--tg-theme-bg-color] p-4 space-y-4">
        {/* Status Update Banner */}
        {showStatusUpdate && (
          <div className="fixed top-0 left-0 right-0 bg-green-500 text-white p-3 z-50 animate-slide-down">
            <div className="flex items-center justify-center space-x-2">
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="font-medium">
                {language === 'km' ? 'ស្ថានភាពបានធ្វើបច្ចុប្បន្នភាព!' : 'Status Updated!'}
              </span>
            </div>
          </div>
        )}

        {/* WebSocket Connection Status */}
        {!isConnected && (
          <Card className="p-3 bg-yellow-50 border-yellow-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <Caption level="1" className="text-yellow-700">
                {language === 'km' 
                  ? 'ការតភ្ជាប់មិនស្ថិតស្ថេរ - ការធ្វើបច្ចុប្បន្នភាពអាចយឺត'
                  : 'Connection unstable - Updates may be delayed'
                }
              </Caption>
            </div>
          </Card>
        )}

        {/* Header */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Title level="2" className="text-[--tg-theme-text-color]">
                {language === 'km' ? 'ការបញ្ជាទិញ' : 'Order'} #{order.orderNumber}
              </Title>
              <Caption level="1" className="text-[--tg-theme-hint-color]">
                {formatTime(order.createdAt)}
                {lastUpdateTime && (
                  <span className="ml-2">
                    • {language === 'km' ? 'ធ្វើបច្ចុប្បន្នភាព' : 'Updated'} {formatTime(lastUpdateTime.toISOString())}
                  </span>
                )}
              </Caption>
            </div>
            <Badge 
              type='dot'
              mode={displayStatus === 'served' ? 'primary' : 'secondary'}
              className={`${getStatusColor(displayStatus)} flex items-center space-x-1`}
            >
              {getStatusIcon(displayStatus)}
              <span>{getOrderStatusText(displayStatus)}</span>
            </Badge>
          </div>

          {/* Restaurant Info */}
          <div className="flex items-center space-x-3 p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
            <MapPin className="w-5 h-5 text-[--tg-theme-hint-color]" />
            <div>
              <Subheadline level="2" className="text-[--tg-theme-text-color]">
                {order.restaurant?.name}
              </Subheadline>
              <Caption level="1" className="text-[--tg-theme-hint-color]">
                {language === 'km' ? 'តុលេខ' : 'Table'} {order.table?.number}
              </Caption>
            </div>
          </div>
        </Card>

        {/* Order Status Timeline */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-4">
            {language === 'km' ? 'ស្ថានភាពការបញ្ជាទិញ' : 'Order Status'}
          </Title>
          
          <div className="space-y-4">
            <OrderStatusStep
              status="pending"
              currentStatus={displayStatus}
              title={language === 'km' ? 'បានទទួលការបញ្ជាទិញ' : 'Order Received'}
              time={order.createdAt}
              language={language}
            />
            <OrderStatusStep
              status="confirmed"
              currentStatus={displayStatus}
              title={language === 'km' ? 'បានបញ្ជាក់ការបញ្ជាទិញ' : 'Order Confirmed'}
              time={order.confirmedAt}
              language={language}
            />
            <OrderStatusStep
              status="preparing"
              currentStatus={displayStatus}
              title={language === 'km' ? 'កំពុងរៀបចំ' : 'Preparing'}
              time={displayStatus === 'preparing' ? getCambodiaTime().toISOString() : undefined}
              language={language}
              isActive={displayStatus === 'preparing'}
            />
            <OrderStatusStep
              status="ready"
              currentStatus={displayStatus}
              title={language === 'km' ? 'រួចរាល់ហើយ' : 'Ready for Pickup'}
              time={order.readyAt}
              language={language}
              isActive={displayStatus === 'ready'}
            />
            <OrderStatusStep
              status="served"
              currentStatus={displayStatus}
              title={language === 'km' ? 'បានបម្រើរួចរាល់' : 'Served'}
              time={order.servedAt}
              language={language}
            />
          </div>

          {/* Estimated Time */}
          {(displayStatus === 'confirmed' || displayStatus === 'preparing') && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <Caption level="1" className="text-blue-700">
                  {language === 'km' 
                    ? `ពេលវេលាប៉ាន់ស្មាន: ${order.estimatedPreparationMinutes} នាទីទៀត`
                    : `Estimated time: ${order.estimatedPreparationMinutes} more minutes`
                  }
                </Caption>
              </div>
            </div>
          )}

          {/* Ready Notification */}
          {displayStatus === 'ready' && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg animate-pulse">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-green-600 animate-bounce" />
                <Caption level="1" className="text-green-700 font-medium">
                  {language === 'km' 
                    ? 'ការបញ្ជាទិញរបស់អ្នករួចរាល់ហើយ! សូមរង់ចាំការបម្រើ។'
                    : 'Your order is ready! Please wait for service.'
                  }
                </Caption>
              </div>
            </div>
          )}
        </Card>

        {/* Order Items */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-4">
            {language === 'km' ? 'បញ្ជីម្ហូប' : 'Order Items'}
          </Title>
          
          <div className="space-y-3">
            {order.orderItems?.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-[--tg-theme-separator-color] last:border-b-0">
                <div className="flex-1">
                  <Subheadline level="2" className="text-[--tg-theme-text-color]">
                    {item.quantity}x {getItemName(item)}
                  </Subheadline>
                  {item.notes && (
                    <Caption level="1" className="text-[--tg-theme-hint-color] italic">
                      {item.notes}
                    </Caption>
                  )}
                </div>
                <Caption level="1" className="text-[--tg-theme-text-color] font-medium">
                  {formatPrice(parseFloat(item.subtotal))}
                </Caption>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
              <Caption level="1" className="text-[--tg-theme-hint-color] mb-1">
                {language === 'km' ? 'កំណត់ចំណាំ:' : 'Order Notes:'}
              </Caption>
              <Subheadline level="2" className="text-[--tg-theme-text-color]">
                {order.notes}
              </Subheadline>
            </div>
          )}

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-[--tg-theme-separator-color]">
            <div className="flex items-center justify-between">
              <Title level="3" className="text-[--tg-theme-text-color]">
                {language === 'km' ? 'សរុប' : 'Total'}
              </Title>
              <Title level="2" className="text-[--tg-theme-link-color]">
                {formatPrice(parseFloat(order.totalAmount))}
              </Title>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        {displayStatus !== 'served' && displayStatus !== 'cancelled' && (
          <div className="space-y-3">
            <Button
              mode="outline"
              size="l"
              stretched
              onClick={() => router.push('/')}
            >
              {language === 'km' ? 'បញ្ជាទិញបន្ថែម' : 'Order More'}
            </Button>
          </div>
        )}
      </div>
    </Page>
  );
}

// Order Status Step Component
interface OrderStatusStepProps {
  status: string;
  currentStatus: string;
  title: string;
  time?: string;
  language: 'en' | 'km';
  isActive?: boolean;
}

function OrderStatusStep({ status, currentStatus, title, time, language, isActive }: OrderStatusStepProps) {
  const statusIndex = ['pending', 'confirmed', 'preparing', 'ready', 'served'].indexOf(status);
  const currentIndex = ['pending', 'confirmed', 'preparing', 'ready', 'served'].indexOf(currentStatus);
  
  const isCompleted = statusIndex <= currentIndex;
  const isCurrent = statusIndex === currentIndex;
  
  return (
    <div className={`flex items-center space-x-3 ${isCompleted ? 'opacity-100' : 'opacity-50'}`}>
      <div className={`w-3 h-3 rounded-full ${
        isCompleted ? 'bg-green-500' : 'bg-gray-300'
      } ${isCurrent ? 'ring-2 ring-green-300' : ''} ${isActive ? 'animate-pulse' : ''}`} />
      
      <div className="flex-1">
        <Subheadline level="2" className={`${
          isCompleted ? 'text-[--tg-theme-text-color]' : 'text-[--tg-theme-hint-color]'
        } ${isActive ? 'font-bold' : ''}`}>
          {title}
        </Subheadline>
        {time && isCompleted && (
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            {new Date(time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Phnom_Penh',
            })}
          </Caption>
        )}
      </div>
    </div>
  );
}
