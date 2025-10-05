export type UserRole = 'admin' | 'waiter' | 'payment';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  birthday: string; // YYYY-MM-DD
};
