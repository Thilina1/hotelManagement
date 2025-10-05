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
