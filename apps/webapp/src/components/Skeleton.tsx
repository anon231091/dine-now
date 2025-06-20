import { Card } from '@telegram-apps/telegram-ui';

interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  rounded?: boolean;
}

export function Skeleton({ 
  className = '', 
  height = '20px', 
  width = '100%',
  rounded = false 
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[--tg-theme-hint-color] opacity-20 ${
        rounded ? 'rounded-full' : 'rounded'
      } ${className}`}
      style={{ height, width }}
    />
  );
}

export function MenuItemSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton width="60%" height="24px" />
          <Skeleton width="90%" height="16px" />
          <div className="flex items-center space-x-4 mt-3">
            <Skeleton width="60px" height="20px" />
            <Skeleton width="80px" height="16px" />
          </div>
        </div>
        <Skeleton width="64px" height="64px" rounded className="ml-4" />
      </div>
    </Card>
  );
}

export function OrderCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton width="120px" height="24px" />
            <Skeleton width="150px" height="16px" />
          </div>
          <Skeleton width="80px" height="28px" />
        </div>
        <Skeleton width="200px" height="16px" />
        <div className="flex items-center justify-between">
          <Skeleton width="100px" height="16px" />
          <Skeleton width="80px" height="20px" />
        </div>
      </div>
    </Card>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height="24px" />
            <Skeleton width="100%" height="16px" />
            <Skeleton width="90%" height="16px" />
          </div>
          <Skeleton width="50px" height="20px" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton width="150px" height="16px" />
          <Skeleton width="80px" height="16px" />
        </div>
      </div>
    </Card>
  );
}

export function CategoryTabsSkeleton() {
  return (
    <div className="flex space-x-4 overflow-x-auto p-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} width="80px" height="32px" className="flex-shrink-0" />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Skeleton width="60px" height="60px" rounded />
          <div className="flex-1 space-y-2">
            <Skeleton width="150px" height="24px" />
            <Skeleton width="100px" height="16px" />
            <Skeleton width="120px" height="16px" />
          </div>
        </div>
        <div className="flex items-center justify-around mt-4 pt-4 border-t border-[--tg-theme-separator-color]">
          <div className="text-center space-y-2">
            <Skeleton width="40px" height="28px" className="mx-auto" />
            <Skeleton width="60px" height="16px" />
          </div>
          <div className="text-center space-y-2">
            <Skeleton width="60px" height="28px" className="mx-auto" />
            <Skeleton width="80px" height="16px" />
          </div>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton width="20px" height="20px" />
                <Skeleton width="120px" height="20px" />
              </div>
              <Skeleton width="60px" height="20px" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function OrderTrackingSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-2">
            <Skeleton width="150px" height="28px" />
            <Skeleton width="100px" height="16px" />
          </div>
          <Skeleton width="100px" height="32px" />
        </div>
        <div className="p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
          <Skeleton width="200px" height="20px" className="mb-1" />
          <Skeleton width="80px" height="16px" />
        </div>
      </Card>

      <Card className="p-4">
        <Skeleton width="120px" height="24px" className="mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton width="12px" height="12px" rounded />
              <div className="flex-1 space-y-1">
                <Skeleton width="150px" height="20px" />
                <Skeleton width="60px" height="16px" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <Skeleton width="100px" height="24px" className="mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[--tg-theme-separator-color] last:border-b-0">
              <div className="space-y-1">
                <Skeleton width="180px" height="20px" />
                <Skeleton width="120px" height="16px" />
              </div>
              <Skeleton width="60px" height="20px" />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[--tg-theme-separator-color] flex items-center justify-between">
          <Skeleton width="60px" height="24px" />
          <Skeleton width="80px" height="28px" />
        </div>
      </Card>
    </div>
  );
}
