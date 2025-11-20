
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, LayoutDashboard, Users, UserCog, UtensilsCrossed, Boxes, CreditCard, BarChart, BedDouble, Star, Building, Utensils } from 'lucide-react';
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

interface MenuItem {
    href: string;
    icon: React.ElementType;
    label: string;
    roles: UserRole[];
}

const generalMenuItems: MenuItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'waiter', 'payment'] },
  { href: '/dashboard/profile', icon: UserCog, label: 'Profile', roles: ['admin', 'waiter', 'payment'] },
  { href: '/dashboard/user-management', icon: Users, label: 'User Management', roles: ['admin'] },
];

const restaurantMenuItems: MenuItem[] = [
  { href: '/dashboard/billing', icon: CreditCard, label: 'Restaurant Billing', roles: ['admin', 'payment'] },
  { href: '/dashboard/menu-management', icon: UtensilsCrossed, label: 'Menu Management', roles: ['admin'] },
  { href: '/dashboard/table-management', icon: TableIcon, label: 'Table Management', roles: ['admin'] },
  { href: '/dashboard/inventory-management', icon: Boxes, label: 'Inventory', roles: ['admin'] },
];

const roomBookingMenuItems: MenuItem[] = [
  { href: '/dashboard/room-management', icon: BedDouble, label: 'Room Management', roles: ['admin'] },
  { href: '/dashboard/bookings', icon: BedDouble, label: 'Booking Management', roles: ['admin'] },
];

const otherMenuItems: MenuItem[] = [
    { href: '/dashboard/activities', icon: Star, label: 'Activities', roles: ['admin'] },
    { href: '/dashboard/reports', icon: BarChart, label: 'Reports', roles: ['admin', 'payment'] },
];


const renderMenuItems = (items: MenuItem[], userRole: UserRole | undefined, pathname: string) => {
    if (!userRole) return null;
    
    const accessibleItems = items.filter(item => item.roles.includes(userRole));
    if (accessibleItems.length === 0) return null;
    
    return accessibleItems.map(item => (
        <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild tooltip={item.label} isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}>
                <Link href={item.href}>
                    <item.icon />
                    {item.label}
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    ));
}

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
    
    const restaurantSection = renderMenuItems(restaurantMenuItems, user?.role, pathname);
    const roomBookingSection = renderMenuItems(roomBookingMenuItems, user?.role, pathname);

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
                  {renderMenuItems(generalMenuItems, user?.role, pathname)}
                  
                  {restaurantSection && (
                     <SidebarGroup className="p-0">
                        <SidebarGroupLabel className="flex items-center"><Utensils className="mr-2"/>Restaurant</SidebarGroupLabel>
                        <SidebarGroupContent>{restaurantSection}</SidebarGroupContent>
                    </SidebarGroup>
                  )}
                  
                  {roomBookingSection && (
                    <SidebarGroup className="p-0">
                        <SidebarGroupLabel className="flex items-center"><Building className="mr-2"/>Room Booking</SidebarGroupLabel>
                        <SidebarGroupContent>{roomBookingSection}</SidebarGroupContent>
                    </SidebarGroup>
                  )}

                  <SidebarSeparator />
                  {renderMenuItems(otherMenuItems, user?.role, pathname)}

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
