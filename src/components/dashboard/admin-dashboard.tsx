"use client";

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoreHorizontal, UserPlus, Trash2, Edit } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { User, UserRole } from '@/lib/types';

// Mock data, in a real app this would come from your backend/database
const initialUsers: User[] = [
  { id: '1', name: 'Admin User', role: 'admin', birthday: '1990-01-01' },
  { id: '2', name: 'Waiter User', role: 'waiter', birthday: '1995-05-10' },
  { id: '3', name: 'Payment User', role: 'payment', birthday: '1998-11-20' },
  { id: '4', name: 'Jane Smith', role: 'waiter', birthday: '1999-03-15' },
  { id: '5', name: 'Mike Johnson', role: 'payment', birthday: '1985-08-22' },
];

const roleColors: Record<UserRole, string> = {
    admin: 'bg-red-500 hover:bg-red-600',
    waiter: 'bg-blue-500 hover:bg-blue-600',
    payment: 'bg-green-500 hover:bg-green-600',
};


export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>(initialUsers);

  // In a real app, these functions would trigger API calls
  const handleAddUser = () => alert("Add user dialog would open here.");
  const handleEditUser = (id: string) => alert(`Edit user dialog for user ${id} would open here.`);
  const handleDeleteUser = (id: string) => {
    if(confirm('Are you sure you want to delete this user?')) {
        setUsers(users.filter(user => user.id !== id));
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage all staff members in one place.</p>
        </div>
        <Button onClick={handleAddUser}>
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff List</CardTitle>
          <CardDescription>A list of all users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Birthday</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`capitalize text-white ${roleColors[user.role]}`}>
                        {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.birthday).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditUser(user.id)}>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
