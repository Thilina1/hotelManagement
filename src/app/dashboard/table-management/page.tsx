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
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Table as TableType, TableSection, TableStatus } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { TableForm } from '@/components/dashboard/table-management/table-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const statusColors: Record<TableStatus, string> = {
    available: 'bg-green-500 text-white',
    occupied: 'bg-yellow-500 text-white',
    reserved: 'bg-purple-500 text-white',
};

const tableSections: TableSection[] = ['Sri Lankan', 'Western', 'Outdoor', 'Bar'];


export default function TableManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const isAllowedToView = currentUser?.role === 'admin';

  const tablesCollection = useMemoFirebase(() => {
    if (!firestore || !isAllowedToView) return null;
    return collection(firestore, 'tables');
  }, [firestore, isAllowedToView]);
  
  const { data: tables, isLoading: areTablesLoading } = useCollection<TableType>(tablesCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);

  const handleAddTableClick = () => {
    setEditingTable(null);
    setIsDialogOpen(true);
  };

  const handleEditTableClick = (table: TableType) => {
    setEditingTable(table);
    setIsDialogOpen(true);
  };
  
  const handleDeleteTable = async (id: string) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this table? This cannot be undone.')) {
      const tableDocRef = doc(firestore, 'tables', id);
      deleteDoc(tableDocRef)
        .then(() => {
            toast({
                title: 'Table Deleted',
                description: 'The table has been successfully removed.',
            });
        })
        .catch(error => {
            console.error("Error deleting table: ", error);
            const permissionError = new FirestorePermissionError({ path: tableDocRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete table.",
            });
        });
    }
  };

  const handleFormSubmit = async (values: Omit<TableType, 'id'>) => {
    if (!firestore || !currentUser) return;
  
    if (editingTable) {
        const tableDocRef = doc(firestore, 'tables', editingTable.id);
        const updateData = {
          ...values,
          updatedAt: serverTimestamp(),
        };
        updateDoc(tableDocRef, updateData)
            .then(() => {
                toast({
                  title: "Table Updated",
                  description: "The table details have been updated.",
                });
            })
            .catch(error => {
                const permissionError = new FirestorePermissionError({ path: tableDocRef.path, operation: 'update', requestResourceData: updateData });
                errorEmitter.emit('permission-error', permissionError);
            });
    } else {
        // Create new table
        const createData = {
            ...values,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const collectionRef = collection(firestore, 'tables');
        addDoc(collectionRef, createData)
            .then(() => {
                toast({
                  title: "Table Created",
                  description: "A new table has been successfully added.",
                });
            })
            .catch(error => {
                const permissionError = new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: createData });
                errorEmitter.emit('permission-error', permissionError);
            });
    }
    setIsDialogOpen(false);
    setEditingTable(null);
  };

  if (!currentUser) {
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

  if (!isAllowedToView) {
      return (
          <div className="text-center flex flex-col items-center justify-center h-full">
              <Card className="p-8 max-w-md w-full">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">You do not have permission to view this page. Please contact an administrator.</p>
                </CardContent>
              </Card>
          </div>
      )
  }
  
  const renderTableForSection = (section: TableSection) => {
    const filteredItems = tables?.filter(item => item.section === section);
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Table No.</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {areTablesLoading && (
                    <>
                    {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                        <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                    ))}
                    </>
                )}
                {!areTablesLoading && filteredItems && filteredItems.map((item) => (
                    <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.tableNumber}</TableCell>
                    <TableCell>{item.capacity}</TableCell>
                    <TableCell>
                        <Badge variant="secondary" className={`capitalize ${statusColors[item.status]}`}>
                            {item.status}
                        </Badge>
                    </TableCell>
                    <TableCell>{item.updatedAt ? new Date((item.updatedAt as any).seconds * 1000).toLocaleString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTableClick(item)}>
                                <Edit className="mr-2 h-4 w-4"/>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteTable(item.id)}>
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                {!areTablesLoading && (!filteredItems || filteredItems.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                            No tables found in this section.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Table Management</h1>
            <p className="text-muted-foreground">Manage all tables in the restaurant.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingTable(null);
          setIsDialogOpen(open);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddTableClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Table
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
                </DialogHeader>
                <TableForm
                    table={editingTable}
                    onSubmit={handleFormSubmit}
                />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tables</CardTitle>
          <CardDescription>A list of all tables in your restaurant, organized by section.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue={tableSections[0]}>
                <TabsList className="grid w-full grid-cols-4">
                    {tableSections.map(section => (
                         <TabsTrigger key={section} value={section}>{section}</TabsTrigger>
                    ))}
                </TabsList>
                 {tableSections.map(section => (
                    <TabsContent key={section} value={section}>
                        <Card>
                            <CardContent className="p-0">
                                {renderTableForSection(section)}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
