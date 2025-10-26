
'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, LayoutDashboard, Users, UserCog, BedDouble, UtensilsCrossed, Boxes, CreditCard, BarChart, CalendarCheck, ClipboardCheck, WalletCards } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Logo, TableIcon } from '../icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserContext } from '@/context/user-context';
import { SidebarRail } from '../ui/sidebar';
import type { UserRole } from '@/lib/types';

const allMenuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'waiter', 'payment'] as UserRole[] },
  { href: '/dashboard/reports', icon: BarChart, label: 'Reports', roles: ['admin', 'payment'] as UserRole[] },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Restaurant Billing', roles: ['admin', 'payment'] as UserRole[] },
  { href: '/dashboard/user-management', icon: Users, label: 'User Management', roles: ['admin'] as UserRole[] },
  { href: '/dashboard/menu-management', icon: UtensilsCrossed, label: 'Menu Management', roles: ['admin'] as UserRole[] },
  { href: '/dashboard/table-management', icon: TableIcon, label: 'Table Management', roles: ['admin'] as UserRole[] },
  { href: '/dashboard/inventory-management', icon: Boxes, label: 'Inventory', roles: ['admin'] as UserRole[] },
  { href: '/dashboard/profile', icon: UserCog, label: 'Profile', roles: ['admin', 'waiter', 'payment'] as UserRole[] },
];


export default function AppSidebar() {
    const auth = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useUserContext();
    const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');

    const logout = async () => {
        if (auth) {
          await signOut(auth);
        }
        router.push('/');
    };
    
    const accessibleMenuItems = allMenuItems.filter(item => user?.role && item.roles.includes(user.role));


    return (
        <Sidebar collapsible="icon">
            <SidebarRail />
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <Logo className="w-8 h-8 text-primary" />
                    <h2 className="text-xl font-headline font-bold text-sidebar-foreground">Hotel</h2>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                  {accessibleMenuItems.map(item => (
                     <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                          <Link href={item.href}>
                              <item.icon />
                              {item.label}
                          </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={logout} tooltip="Logout">
                            <LogOut />
                            Logout
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                 <Link href="/dashboard/profile" className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-sidebar-accent transition-colors">
                    <Avatar>
                         {avatar && <AvatarImage src={user?.name} />}
                        <AvatarFallback>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-sm truncate">{user?.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                    </div>
                </Link>
                 <SidebarTrigger className="w-full" />
            </SidebarFooter>
        </Sidebar>
    );
}

    