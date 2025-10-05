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

export type MenuCategory = 'Sri Lankan' | 'Western' | 'Bar';

export type MenuItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    category: MenuCategory;
    availability: boolean;
    createdAt?: string | { seconds: number; nanoseconds: number };
    updatedAt?: string | { seconds: number; nanoseconds: number };
};
