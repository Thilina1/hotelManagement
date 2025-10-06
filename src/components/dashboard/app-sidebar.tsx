
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
import { LogOut, LayoutDashboard, Users, UserCog, BedDouble, UtensilsCrossed, Boxes, CreditCard, BarChart } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Logo, TableIcon } from '../icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserContext } from '@/context/user-context';
import { SidebarRail } from '../ui/sidebar';

export default function AppSidebar() {
    const auth = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useUserContext();
    const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');

    const logout = async () => {
        await signOut(auth);
        router.push('/');
    };

    const menuItems = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/reports', icon: BarChart, label: 'Reports' },
      { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
      { href: '/dashboard/user-management', icon: Users, label: 'User Management' },
      { href: '/dashboard/room-management', icon: BedDouble, label: 'Room Management' },
      { href: '/dashboard/menu-management', icon: UtensilsCrossed, label: 'Menu Management' },
      { href: '/dashboard/table-management', icon: TableIcon, label: 'Table Management' },
      { href: '/dashboard/inventory-management', icon: Boxes, label: 'Inventory' },
      { href: '/dashboard/profile', icon: UserCog, label: 'Profile' },
    ];

    return (
        <Sidebar collapsible="icon">
            <SidebarRail />
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <Logo className="w-8 h-8 text-primary" />
                    <h2 className="text-xl font-headline font-bold text-sidebar-foreground"></h2>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                  {menuItems.map(item => (
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

    
