'use client';

import { 
  FixedLayout,
  Tabbar,
  TabbarItem
} from '@telegram-apps/telegram-ui';
import { Home, History, User, Search } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useUIStore } from '../store';
import { useTelegram } from '../providers/TelegramProvider';

export function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useUIStore();
  const { impactHaptic } = useTelegram();

  const navItems = [
    {
      id: 'home',
      icon: Home,
      label: language === 'km' ? 'ទំព័រដើម' : 'Home',
      path: '/',
    },
    {
      id: 'search',
      icon: Search,
      label: language === 'km' ? 'ស្វែងរក' : 'Search',
      path: '/search',
    },
    {
      id: 'orders',
      icon: History,
      label: language === 'km' ? 'ប្រវត្តិ' : 'Orders',
      path: '/orders',
    },
    {
      id: 'profile',
      icon: User,
      label: language === 'km' ? 'គណនី' : 'Profile',
      path: '/profile',
    },
  ];

  const handleNavigation = (path: string) => {
    impactHaptic('light');
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
            <TabbarItem
              key={item.id}
              text={item.label}
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon className="w-5 h-5" />
            </TabbarItem>
          );
        })}
      </Tabbar>
    </FixedLayout>
  );
}

// Language Switcher Component
export function LanguageSwitcher() {
  const { language, setLanguage } = useUIStore();
  const { impactHaptic } = useTelegram();

  const handleLanguageSwitch = () => {
    impactHaptic('light');
    setLanguage(language === 'en' ? 'km' : 'en');
  };

  return (
    <button
      onClick={handleLanguageSwitch}
      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-[--tg-theme-secondary-bg-color] transition-colors"
    >
      <div className="flex items-center space-x-1">
        <div className={`w-6 h-4 rounded-sm ${language === 'en' ? 'bg-blue-500' : 'bg-gray-300'} flex items-center justify-center`}>
          <span className="text-xs text-white font-bold">EN</span>
        </div>
        <div className={`w-6 h-4 rounded-sm ${language === 'km' ? 'bg-red-500' : 'bg-gray-300'} flex items-center justify-center`}>
          <span className="text-xs text-white font-bold">ខ្មែរ</span>
        </div>
      </div>
    </button>
  );
}
