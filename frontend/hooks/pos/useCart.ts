import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ICartItem, IProduct } from '../../types';

export const useCart = () => {
  const [cart, setCart] = useState<ICartItem[]>([]);
  const cartEndRef = useRef<HTMLDivElement>(null);

  const total = useMemo(() => 
    cart.reduce((acc, item) => acc + item.total, 0),
    [cart]
  );

  useEffect(() => {
    if (cart.length > 0) {
      cartEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cart]);

  const addToCart = useCallback((product: IProduct) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => 
          p.id === product.id 
            ? { ...p, qty: p.qty + 1, total: (p.qty + 1) * p.price } 
            : p
        );
      }
      return [...prev, { ...product, qty: 1, total: product.price }];
    });
  }, []);

  const updateItemQuantity = useCallback((productId: string, newQty: number) => {
    setCart(prev => 
      prev.map(p => {
        if (p.id === productId) {
          if (newQty <= 0) {
            return null; // Marcar para remoção
          }
          return { ...p, qty: newQty, total: newQty * p.price };
        }
        return p;
      }).filter((p): p is ICartItem => p !== null)
    );
  }, []);

  const removeLastItem = useCallback(() => {
    setCart(prev => prev.slice(0, -1));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return {
    cart,
    cartEndRef,
    total,
    addToCart,
    updateItemQuantity,
    removeLastItem,
    clearCart,
  };
};
