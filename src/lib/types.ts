import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'waiter' | 'kitchen' | 'payment';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp;
};

export type Table = {
  id: string;
  tableNumber: number;
  status: 'available' | 'occupied' | 'reserved';
  capacity: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  buyingPrice: number;
  category: 'Sri Lankan' | 'Western' | 'Bar';
  availability: boolean;
  stockType: 'Inventoried' | 'Non-Inventoried';
  stock?: number;
  unit?: 'kg' | 'g' | 'l' | 'ml';
  sellType: 'Direct' | 'Indirect';
  varietyOfDishesh?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Order = {
  id: string;
  tableId: string;
  tableNumber: number;
  status: 'open' | 'billed' | 'closed';
  totalPrice: number;
  waiterId: string;
  waiterName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  billNumber?: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Bill = {
    id: string;
    billNumber: string;
    orderId: string;
    tableId: string;
    tableNumber: number;
    waiterName: string;
    items: OrderItem[];
    status: 'unpaid' | 'paid' | 'cancelled';
    paymentMethod?: 'cash' | 'card';
    subtotal: number;
    discount: number;
    total: number;
    createdAt: Timestamp;
    paidAt?: Timestamp;
};

export type WithId<T> = T & { id: string };
