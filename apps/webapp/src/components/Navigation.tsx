'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  FixedLayout,
  Tabbar,
} from '@telegram-apps/telegram-ui';
import { Home, History, User, Search } from 'lucide-react';

export function BottomNavigation() {
  const router = useRouter();
  const t = useTranslations('Navigation');
  const pathname = usePathname();

  const navItems = [
    {
      id: 'home',
      icon: Home,
      label: t('Home'),
      path: '/',
    },
    {
      id: 'search',
      icon: Search,
      label: t('Search'),
      path: '/search',
    },
    {
      id: 'orders',
      icon: History,
      label: t('Orders'),
      path: '/orders',
    },
    {
      id: 'profile',
      icon: User,
      label: t('Profile'),
      path: '/profile',
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <FixedLayout 
      vertical="bottom" 
      className="border-t border-[--tg-theme-separator-color] bg-[--tg-theme-bg-color]"
    >
      <Tabbar>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Tabbar.Item
              key={item.id}
              text={item.label}
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon className="w-5 h-5" />
            </Tabbar.Item>
          );
        })}
      </Tabbar>
    </FixedLayout>
  );
}
