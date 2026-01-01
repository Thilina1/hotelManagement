
import type { FieldValue } from 'firebase/firestore';

export type UserRole = 'admin' | 'waiter' | 'payment';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  birthday: string; // YYYY-MM-DD
  createdAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
  updatedAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
  createdBy?: string;
  updatedBy?: string;
};

export type MenuCategory = 'Sri Lankan' | 'Western' | 'Bar';
export type StockType = 'Inventoried' | 'Non-Inventoried';

export type MenuItem = {
    id: string;
    name: string;
    description?: string;
    price: number;
    buyingPrice: number;
    category: MenuCategory;
    availability: boolean;
    stockType: StockType;
    stock?: number;
    varietyOfDishesh?: string;
    createdAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
    updatedAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
};

export type TableSection = 'Sri Lankan' | 'Western' | 'Outdoor' | 'Bar';
export type TableStatus = 'available' | 'occupied' | 'reserved';

export type Table = {
    id: string;
    tableNumber: string;
    section: TableSection;
    capacity: number;
    status: TableStatus;
    createdAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
    updatedAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
}

export type OrderStatus = 'open' | 'billed' | 'paid' | 'cancelled';

export type Order = {
    id: string;
    tableId: string;
    status: OrderStatus;
    totalPrice: number;
    waiterId?: string;
    waiterName?: string;
    createdAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
    updatedAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
};

export type OrderItem = {
    id: string;
    orderId: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
};

export type BillItem = {
    id: string; // menuItemId
    name: string;
    price: number;
    quantity: number;
}

export type BillStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'cash' | 'card';

export type Bill = {
  id: string;
  billNumber: string;
  orderId?: string;
  tableId?: string;
  tableNumber: string;
  customerName?: string;
  waiterName?: string;
  items: BillItem[];
  status: BillStatus;
  paymentMethod?: PaymentMethod;
  subtotal?: number;
  discount?: number; // Percentage
  total: number;
  createdAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
  paidAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
};

export type RoomType = 'Single' | 'Double' | 'Suite' | 'Deluxe';
export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export type Room = {
    id: string;
    roomNumber: string;
    type: RoomType;
    pricePerNight: number;
    status: RoomStatus;
    title: string;
    description: string;
    imageUrl: string;
    roomCount: number;
    view: string;
}

export type ReservationStatus = 'booked' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';

export type ReservationItem = {
    description: string;
    quantity: number;
    price: number;
}

export type Reservation = {
    id: string;
    bookingDate: string; // ISO String
    checkInDate: string; // YYYY-MM-DD
    checkOutDate: string; // YYYY-MM-DD
    guestEmail: string;
    guestId: string;
    guestName: string;
    idCardNumber?: string;
    numberOfGuests: number;
    roomId: string;
    roomTitle: string;
    specialRequests?: string;
    status: ReservationStatus;
    items: ReservationItem[];
    totalCost: number;
}

export type ActivityType = 'priceable' | 'non-priceable';

export type Activity = {
    id: string;
    name: string;
    description: string;
    type: ActivityType;
    pricePerPerson?: number;
    createdAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
    updatedAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
}

export type Experience = {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    createdAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
    updatedAt?: string | { seconds: number; nanoseconds: number } | FieldValue;
}

export type BlogColor = 'amber' | 'green' | 'creme' | 'blue';

export type Blog = {
    id: string;
    title: string;
    previewHeader: string;
    previewDescription: string;
    header1: string;
    content1: string;
    content2?: string;
    contentImage: string;
    featured: boolean;
    featuredPosition?: number;
    color: BlogColor;
    tags: string[];
    proTips: { title: string; description: string }[];
    bookingButtonText: string;
    bookingButtonContent: string;
    authorId: string;
    createdAt: string | { seconds: number; nanoseconds: number } | FieldValue;
    updatedAt: string | { seconds: number; nanoseconds: number } | FieldValue;
}

export type Expense = {
    id: string;
    date: string;
    name: string;
    price: number;
    remark?: string;
    createdAt?: string | { seconds: number, nanoseconds: number } | FieldValue;
    updatedAt?: string | { seconds: number, nanoseconds: number } | FieldValue;
};

export type OtherIncome = {
    id: string;
    date: string;
    name: string;
    price: number;
    remark?: string;
    createdAt?: string | { seconds: number, nanoseconds: number } | FieldValue;
    updatedAt?: string | { seconds: number, nanoseconds: number } | FieldValue;
};
