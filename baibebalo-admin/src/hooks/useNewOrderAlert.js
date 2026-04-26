import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersAPI } from '../api/orders';
import adminSound from '../utils/adminSound';

const POLL_INTERVAL = 30000;
const STORAGE_KEY = '@baibebalo_admin_seen_orders';

const getSeenIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const saveSeenIds = (ids) => {
  // Garder seulement les 200 derniers pour ne pas surcharger le localStorage
  const arr = [...ids].slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
};

export const useNewOrderAlert = () => {
  const [toasts, setToasts] = useState([]);
  const initializedRef = useRef(false);
  const soundEnabledRef = useRef(true);

  const { data } = useQuery({
    queryKey: ['new-order-alert-poll'],
    queryFn: () => ordersAPI.getOrders({ status: 'new', limit: 20, sort: 'placed_at', order: 'desc' }),
    refetchInterval: POLL_INTERVAL,
    staleTime: 10000,
  });

  useEffect(() => {
    const orders = data?.orders || data?.data?.orders || [];
    if (!orders.length) return;

    const seenIds = getSeenIds();

    if (!initializedRef.current) {
      // Premier chargement : marquer tout comme vu, ne pas sonner
      orders.forEach((o) => seenIds.add(o.id));
      saveSeenIds(seenIds);
      initializedRef.current = true;
      return;
    }

    const newOrders = orders.filter((o) => !seenIds.has(o.id));
    if (!newOrders.length) return;

    // Marquer comme vus
    newOrders.forEach((o) => seenIds.add(o.id));
    saveSeenIds(seenIds);

    // Son
    if (soundEnabledRef.current) adminSound.newOrder();

    // Notification navigateur si permission accordée
    if (Notification.permission === 'granted') {
      newOrders.forEach((o) => {
        new Notification(`Nouvelle commande #${o.order_number || o.id?.slice(0, 8)}`, {
          body: `${o.restaurant_name || o.restaurant?.name || 'Restaurant'} · ${(o.total || 0).toLocaleString('fr-FR')} FCFA`,
          icon: '/favicon.ico',
          tag: `order-${o.id}`,
        });
      });
    }

    // Toasts in-app
    const newToasts = newOrders.map((o) => ({
      id: o.id,
      orderNumber: o.order_number || o.id?.slice(0, 8),
      restaurant: o.restaurant_name || o.restaurant?.name || 'Restaurant',
      total: o.total || 0,
      createdAt: Date.now(),
    }));

    setToasts((prev) => [...newToasts, ...prev].slice(0, 5));
  }, [data]);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const toggleSound = () => { soundEnabledRef.current = !soundEnabledRef.current; };

  const requestNotificationPermission = () => {
    if (Notification.permission === 'default') Notification.requestPermission();
  };

  return { toasts, dismissToast, toggleSound, requestNotificationPermission };
};
