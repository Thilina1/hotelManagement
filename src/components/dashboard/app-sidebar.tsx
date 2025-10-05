"use client";

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
import { LogOut, LayoutDashboard, UserCog, ClipboardList, CreditCard } from 'lucide-react';
import type { User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '../icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface AppSidebarProps {
  user: User | null;
}

export default function AppSidebar({ user }: AppSidebarProps) {
    const { logout } = useAuth();
    const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');

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
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard" tooltip="Dashboard" isActive>
                            <LayoutDashboard />
                            Dashboard
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {user?.role === 'admin' && (
                         <SidebarMenuItem>
                            <SidebarMenuButton href="/dashboard" tooltip="Admin Panel" isActive>
                                <UserCog />
                                Admin Panel
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                     {user?.role === 'waiter' && (
                         <SidebarMenuItem>
                            <SidebarMenuButton href="/dashboard" tooltip="Orders" isActive>
                                <ClipboardList />
                                Orders
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                    {user?.role === 'payment' && (
                         <SidebarMenuItem>
                            <SidebarMenuButton href="/dashboard" tooltip="Payments" isActive>
                                <CreditCard />
                                Payments
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <div className="flex items-center gap-3">
                    <Avatar>
                         {avatar && <AvatarImage src={avatar.imageUrl} alt={user?.name} />}
                        <AvatarFallback>{user?.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-sm truncate">{user?.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                    </div>
                    <button onClick={logout} className="ml-auto p-2 rounded-md hover:bg-sidebar-accent">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
