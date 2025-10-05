'use client';

import { useState, useEffect } from 'react';
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, deleteDoc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { UserForm } from '@/components/dashboard/user-management/user-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const roleColors: Record<UserRole, string> = {
    admin: 'bg-primary text-primary-foreground',
    waiter: 'bg-accent text-accent-foreground',
    payment: 'bg-emerald-500 text-white',
};

export default function UserManagementPage() {
  const { user: firebaseUser, isUserLoading } = useUser();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const firestore = useFirestore();
  const auth = getAuth();

  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  const { data: users, isLoading } = useCollection<User>(usersCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setCurrentUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
        }
      }
    };
    fetchCurrentUser();
  }, [firebaseUser, firestore]);

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
      try {
        await deleteDoc(doc(firestore, 'users', id));
        // Note: This does not delete the user from Firebase Auth.
        // A cloud function would be needed for that.
      } catch (error) {
        console.error("Error deleting user: ", error);
        alert("Failed to delete user.");
      }
    }
  };

  const handleFormSubmit = async (values: Partial<User> & { email?: string; password?: string }) => {
    if (!firestore || !usersCollection || !currentUser || !auth) return;

    try {
        if (editingUser) {
            // Update user in Firestore
            const userDocRef = doc(firestore, 'users', editingUser.id);
            const { email, password, ...firestoreData } = values;
            await updateDoc(userDocRef, {
                ...firestoreData,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.id,
            });
            // Password updates should be handled by a dedicated, secure flow
            // For this example, we are not updating the password from this form
            // to avoid handling sensitive data directly.
        } else {
            // Create user in Auth and Firestore
            if (!values.email || !values.password) {
                throw new Error("Email and password are required for new users.");
            }
            
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
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
        }
        setIsDialogOpen(false);
        setEditingUser(null);
    } catch (error: any) {
        console.error("Error saving user:", error);
        if (error.code === 'auth/email-already-in-use') {
            alert('This email address is already in use by another account.');
        } else {
            alert(`Failed to save user. ${error.message}`);
        }
    }
  };

  if (isUserLoading || !currentUser) {
     return (
       <div className="space-y-6">
        <div className="flex justify-between items-start">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-10 w-28" />
        </div>
        <Card className="glassy rounded-2xl">
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

  if (currentUser?.role !== 'admin') {
      return (
          <div className="text-center">
              <h2 className="text-2xl font-bold">Access Denied</h2>
              <p>You do not have permission to view this page.</p>
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
          setIsDialogOpen(open);
          if (!open) setEditingUser(null);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddUserClick} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </DialogTrigger>
            <DialogContent className="glassy">
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

      <Card className="glassy rounded-2xl">
        <CardHeader>
          <CardTitle>Staff List</CardTitle>
          <CardDescription>A list of all users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/20">
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Birthday</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <TableRow key={i} className="border-white/10">
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full bg-white/10" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!isLoading && users && users.map((user) => (
                <TableRow key={user.id} className="border-white/10">
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
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glassy">
                        <DropdownMenuItem onClick={() => handleEditUserClick(user)} className="hover:bg-white/10">
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500 hover:!text-red-500 hover:!bg-red-500/10" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!isLoading && (!users || users.length === 0) && (
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
