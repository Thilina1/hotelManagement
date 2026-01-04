'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User, UserRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const ROLES: UserRole[] = ['admin', 'waiter', 'kitchen', 'payment'];

export default function UserManagementPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersCollection);

    const [userRoles, setUserRoles] = useState<Record<string, UserRole>>({});

    const handleRoleChange = (userId: string, role: UserRole) => {
        setUserRoles(prev => ({ ...prev, [userId]: role }));
    };

    const handleSaveChanges = async (userId: string) => {
        if (!firestore) return;
        const newRole = userRoles[userId];
        if (!newRole) {
            toast({ variant: 'destructive', title: 'No change', description: 'Please select a new role first.' });
            return;
        }

        const userRef = doc(firestore, 'users', userId);
        try {
            await updateDoc(userRef, { role: newRole });
            toast({ title: 'Role Updated', description: `User role has been successfully changed to ${newRole}.` });
        } catch (error) {
            console.error("Error updating user role:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the user role.' });
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!firestore) return;
        if (!confirm(`Are you sure you want to delete the user "${userName}"? This action cannot be undone.`)) {
            return;
        }

        const userRef = doc(firestore, 'users', userId);
        try {
            await deleteDoc(userRef);
            toast({ title: 'User Deleted', description: `User "${userName}" has been successfully deleted.` });
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the user.' });
        }
    };
    
    const sortedUsers = useMemo(() => {
        if (!users) return [];
        return [...users].sort((a, b) => a.name.localeCompare(b.name));
    }, [users]);


    if (areUsersLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="w-1/4"><Skeleton className="h-6 w-full" /></div>
                                <div className="w-1/4"><Skeleton className="h-6 w-full" /></div>
                                <div className="w-1/4"><Skeleton className="h-10 w-full" /></div>
                                <div className="w-1/6 flex gap-2"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-10 w-1/2" /></div>
                            </div>
                        ))}
                      </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-bold">User Management</h1>
                <p className="text-muted-foreground">Manage user accounts and roles.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>View and manage all registered users in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Current Role</TableHead>
                                <TableHead>Change Role</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell className="capitalize">{user.role}</TableCell>
                                    <TableCell>
                                        <Select onValueChange={(value: UserRole) => handleRoleChange(user.id, value)} defaultValue={user.role}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLES.map(role => (
                                                    <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" onClick={() => handleSaveChanges(user.id)} disabled={!userRoles[user.id] || userRoles[user.id] === user.role}>
                                            <Save className="mr-2 h-4 w-4"/> Save
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id, user.name)}>
                                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
