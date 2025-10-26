

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

export type RoomType = 'Single' | 'Double' | 'Suite' | 'Deluxe';
export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export type Room = {
    id: string;
    roomNumber: string;
    type: RoomType;
    pricePerNight: number;
    status: RoomStatus;
}

export type BookingStatus = 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';

export type Booking = {
    id: string;
    bookingNumber: string;
    roomId: string;
    roomNumber: string;
    guestName: string;
    guestEmail: string;
    guestContact: string;
    guestNIC: string;
    checkInDate: string; // ISO String
    checkOutDate: string; // ISO String
    adults: number;
    children: number;
    status: BookingStatus;
}

    