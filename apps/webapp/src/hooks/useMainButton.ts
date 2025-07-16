'use client';

import { useEffect, useCallback } from 'react';
import { mainButton } from '@telegram-apps/sdk-react';
import { Formats } from 'next-intl';

interface MainButtonConfig {
  text: string;
  isVisible?: boolean;
  isEnabled?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  backgroundColor?: `#${string}`;
  textColor?: `#${string}`;
}

export function useMainButton(config: MainButtonConfig) {
  const {
    text,
    isVisible = true,
    isEnabled = true,
    isLoading = false,
    onClick,
    backgroundColor,
    textColor
  } = config;

  // Set button parameters
  useEffect(() => {
    if (mainButton.setParams.isAvailable()) {
      mainButton.setParams({
        text: isLoading ? 'Loading...' : text,
        isVisible,
        isEnabled: isEnabled && !isLoading,
        textColor,
        backgroundColor
      });
    }
  }, [text, isVisible, isEnabled, isLoading, backgroundColor, textColor]);

  // Handle click events
  useEffect(() => {
    if (onClick && mainButton.onClick.isAvailable()) {
      return mainButton.onClick(onClick);
    }
  }, [onClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mainButton.setParams.isAvailable()) {
        mainButton.setParams({ isVisible: false });
      }
    };
  }, []);

  return {
    show: () => {
      if (mainButton.setParams.isAvailable()) {
        mainButton.setParams({ isVisible: true });
      }
    },
    hide: () => {
      if (mainButton.setParams.isAvailable()) {
        mainButton.setParams({ isVisible: false });
      }
    },
    enable: () => {
      if (mainButton.setParams.isAvailable()) {
        mainButton.setParams({ isEnabled: true });
      }
    },
    disable: () => {
      if (mainButton.setParams.isAvailable()) {
        mainButton.setParams({ isEnabled: false });
      }
    },
    setText: (newText: string) => {
      if (mainButton.setParams.isAvailable()) {
        mainButton.setParams({ text: newText });
      }
    }
  };
}

// Specialized hook for cart/order actions
export function useCartMainButton() {
  const setCartButton = useCallback((config: {
    itemCount: number;
    totalAmount: number;
    onViewCart: () => void;
    formatter: any;
  }) => {
    const { itemCount, totalAmount, onViewCart, formatter } = config;
    
    if (mainButton.setParams.isAvailable()) {
      if (itemCount > 0) {
        mainButton.setParams({
          text: `View Cart (${itemCount}) • ${formatter.number(totalAmount, 'currency')}`,
          isVisible: true,
          isEnabled: true,
        });
        
        if (mainButton.onClick.isAvailable()) {
          return mainButton.onClick(onViewCart);
        }
      } else {
        mainButton.setParams({ isVisible: false });
      }
    }
  }, []);

  const setOrderButton = useCallback((config: {
    totalAmount: number;
    onPlaceOrder: () => void;
    formatter: any;
    isLoading?: boolean;
    isEnabled?: boolean;
  }) => {
    const { totalAmount, onPlaceOrder, formatter, isLoading = false, isEnabled = true } = config;
    
    if (mainButton.setParams.isAvailable()) {
      mainButton.setParams({
        text: isLoading 
          ? 'Placing Order...' 
          : `Place Order • ${formatter.number(totalAmount, 'currency')}`,
        isVisible: true,
        isEnabled: isEnabled && !isLoading,
        backgroundColor: '#28a745', // Green color for order button
      });
      
      if (mainButton.onClick.isAvailable()) {
        return mainButton.onClick(onPlaceOrder);
      }
    }
  }, []);

  const hideMainButton = useCallback(() => {
    if (mainButton.setParams.isAvailable()) {
      mainButton.setParams({ isVisible: false });
    }
  }, []);

  return {
    setCartButton,
    setOrderButton,
    hideMainButton
  };
}
