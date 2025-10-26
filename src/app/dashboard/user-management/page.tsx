
'use client';

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
import { Badge } from '@/components/ui/badge';
import type { User, UserRole } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { UserForm } from '@/components/dashboard/user-management/user-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';

const roleColors: Record<UserRole, string> = {
    admin: 'bg-primary text-primary-foreground',
    waiter: 'bg-accent text-accent-foreground',
    payment: 'bg-emerald-500 text-white',
};

export default function UserManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  
  const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleAddUserClick = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const handleEditUserClick = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };
  
  const handleDeleteUser = async (id: string) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this user? This cannot be undone.')) {
      deleteDoc(doc(firestore, 'users', id))
        .then(() => {
            toast({
                title: 'User Deleted',
                description: 'The user has been successfully removed.',
            });
        })
        .catch(error => {
            console.error("Error deleting user: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete user.",
            });
        });
    }
  };

  const handleFormSubmit = async (values: Partial<User> & { email?: string; password?: string }) => {
    if (!firestore || !currentUser) return;
  
    try {
      if (editingUser) {
        // Update existing user
        const { email, password, ...firestoreData } = values; // email and password are not updated here
        await updateDoc(doc(firestore, 'users', editingUser.id), {
          ...firestoreData,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.id,
        });
        toast({
          title: "User Updated",
          description: "The user's details have been updated.",
        });
      } else {
        // Create new user
        if (!values.email || !values.password) {
          throw new Error("Email and password are required for new users.");
        }
        
        // This creates the user in a temporary auth instance so it doesn't log out the admin
        const tempAuth = getAuth(); 
        const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, values.password);
        const newUser = userCredential.user;
        
        const { email, password, ...firestoreData } = values;
        
        await setDoc(doc(firestore, 'users', newUser.uid), {
          ...firestoreData,
          id: newUser.uid,
          createdAt: serverTimestamp(),
          createdBy: currentUser.id,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.id,
        });
        toast({
          title: "User Created",
          description: "A new user has been successfully added.",
        });
      }
      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error("Error saving user:", error);
      let description = `Failed to save user. ${error.message}`;
      if (error.code === 'auth/email-already-in-use') {
        description = 'This email address is already in use by another account.';
      }
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: description,
      });
    }
  };

  if (!currentUser || areUsersLoading) {
     return (
       <div className="space-y-6">
        <div className="flex justify-between items-start">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-10 w-28" />
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
        </Card>
      </div>
     )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage all staff members in one place.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingUser(null);
          setIsDialogOpen(open);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddUserClick} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                </DialogHeader>
                <UserForm
                    user={editingUser}
                    onSubmit={handleFormSubmit}
                />
            </DialogContent>
        </Dialog>
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
                <TableHead>Updated At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areUsersLoading && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!areUsersLoading && users && users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`capitalize ${roleColors[user.role]}`}>
                        {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.birthday ? new Date(user.birthday).toLocaleDateString() : 'N/A'}</TableCell>
                   <TableCell>{user.updatedAt ? new Date((user.updatedAt as any).seconds * 1000).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditUserClick(user)}>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!areUsersLoading && (!users || users.length === 0) && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        No users found.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
