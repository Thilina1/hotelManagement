

export type UserRole = 'admin' | 'waiter' | 'payment';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  birthday: string; // YYYY-MM-DD
  createdAt?: string | { seconds: number; nanoseconds: number };
  updatedAt?: string | { seconds: number; nanoseconds: number };
  createdBy?: string;
  updatedBy?: string;
};

export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';
export type RoomType = 'Single' | 'Double' | 'Suite' | 'Family';

export type Room = {
  id: string;
  roomNumber: string;
  type: RoomType;
  status: RoomStatus;
  price: number;
  createdAt?: string | { seconds: number; nanoseconds: number };
  updatedAt?: string | { seconds: number; nanoseconds: number };
};

export type BookingStatus = 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';

export type PackageActivity = {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    tea: boolean;
    activity1: boolean;
    activity2: boolean;
};

export type Booking = {
    id: string;
    roomId: string;
    roomNumber?: string; // Denormalized for display
    guestName: string;
    guestEmail: string;
    guestNic: string;
    guestPhone: string;
    checkInDate: string | { seconds: number; nanoseconds: number };
    checkOutDate: string | { seconds: number; nanoseconds: number };
    adults: number;
    children: number;
    totalPrice: number;
    advancePayment: number;
    status: BookingStatus;
    packageActivities: Record<string, PackageActivity>;
    extraCharges?: number;
    createdAt?: string | { seconds: number; nanoseconds: number };
    updatedAt?: string | { seconds: number; nanoseconds: number };
};

export type MenuCategory = 'Sri Lankan' | 'Western' | 'Bar';
export type StockType = 'Inventoried' | 'Non-Inventoried';

export type MenuItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    category: MenuCategory;
    availability: boolean;
    stockType: StockType;
    stock?: number;
    createdAt?: string | { seconds: number; nanoseconds: number };
    updatedAt?: string | { seconds: number; nanoseconds: number };
};

export type TableSection = 'Sri Lankan' | 'Western' | 'Outdoor' | 'Bar';
export type TableStatus = 'available' | 'occupied' | 'reserved';

export type Table = {
    id: string;
    tableNumber: string;
    section: TableSection;
    capacity: number;
    status: TableStatus;
    createdAt?: string | { seconds: number; nanoseconds: number };
    updatedAt?: string | { seconds: number; nanoseconds: number };
}

export type OrderStatus = 'open' | 'billed' | 'paid' | 'cancelled';

export type Order = {
    id: string;
    tableId: string;
    status: OrderStatus;
    totalPrice: number;
    waiterId?: string;
    waiterName?: string;
    createdAt?: string | { seconds: number; nanoseconds: number };
    updatedAt?: string | { seconds: number; nanoseconds: number };
};

export type OrderItem = {
    id: string;
    orderId: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
};

export type BillStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'cash' | 'card';

export type Bill = {
  id: string;
  billNumber: string;
  orderId: string;
  tableId: string;
  tableNumber: string;
  waiterName?: string;
  items: OrderItem[];
  status: BillStatus;
  paymentMethod?: PaymentMethod;
  subtotal: number;
  discount: number; // Percentage
  total: number;
  createdAt?: string | { seconds: number; nanoseconds: number };
  paidAt?: string | { seconds: number; nanoseconds: number };
};
