'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, LayoutDashboard, UserCog, ClipboardList, CreditCard, Users } from 'lucide-react';
import type { User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '../icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppSidebarProps {
  user: User | null;
}

export default function AppSidebar({ user }: AppSidebarProps) {
    const { logout } = useAuth();
    const pathname = usePathname();
    const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');

    const menuItems = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'waiter', 'payment'] },
      { href: '/dashboard/user-management', icon: Users, label: 'User Management', roles: ['admin'] },
      { href: '#', icon: ClipboardList, label: 'Orders', roles: ['waiter'] },
      { href: '#', icon: CreditCard, label: 'Payments', roles: ['payment'] },
    ];

    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <Logo className="w-8 h-8 text-primary" />
                    <h2 className="text-xl font-headline font-bold text-sidebar-foreground">Staff Manager</h2>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                  {menuItems.filter(item => user?.role && item.roles.includes(user.role)).map(item => (
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
                <div className="flex items-center gap-3">
                    <Avatar>
                         {avatar && <AvatarImage src={avatar.imageUrl} alt={user?.name} />}
                        <AvatarFallback>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-sm truncate">{user?.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}