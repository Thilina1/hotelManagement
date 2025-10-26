
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUserContext } from '@/context/user-context';
import { SidebarTrigger } from '../ui/sidebar';

const getPageTitle = (pathname: string) => {
    switch (pathname) {
        case '/dashboard':
            return 'Dashboard';
        case '/dashboard/profile':
            return 'Profile';
        case '/dashboard/user-management':
            return 'User Management';
        case '/dashboard/room-management':
            return 'Room Management';
        case '/dashboard/menu-management':
            return 'Menu Management';
        case '/dashboard/table-management':
            return 'Table Management';
        case '/dashboard/inventory-management':
            return 'Inventory Management';
        case '/dashboard/billing':
            return 'Billing';
        case '/dashboard/reports':
            return 'Reports';
        default:
             if (pathname.startsWith('/dashboard/tables/')) {
                return 'Table Order';
            }
            return 'Dashboard';
    }
}

export default function DashboardHeader() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserContext();
  const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="sm:hidden" />
      </div>
      <div className="flex-1">
        <h1 className="font-semibold text-lg">{getPageTitle(pathname)}</h1>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Avatar>
              {avatar && <AvatarImage src={user?.name} />}
              <AvatarFallback>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
