'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Search, Save, ArrowUpDown } from 'lucide-react';
import type { MenuItem as MenuItemType } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type SortKey = keyof Pick<MenuItemType, 'name' | 'category' | 'stock'>;

export default function InventoryManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const isAllowedToView = currentUser?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [stockLevels, setStockLevels] = useState<Record<string, number | string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });


  const inventoryItemsCollection = useMemoFirebase(() => {
    if (!firestore || !isAllowedToView) return null;
    return query(collection(firestore, 'menuItems'), where('stockType', '==', 'Inventoried'));
  }, [firestore, isAllowedToView]);

  const { data: inventoryItems, isLoading: areItemsLoading } = useCollection<MenuItemType>(inventoryItemsCollection);

  const filteredItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryItems, searchTerm]);

  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredItems, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleStockChange = (itemId: string, value: string) => {
    const parsedValue = value === '' ? '' : parseInt(value, 10);
    setStockLevels(prev => ({ ...prev, [itemId]: isNaN(parsedValue as number) ? '' : parsedValue }));
  };

  const handleUpdateStock = async (itemId: string) => {
    if (!firestore) return;
    const newStock = stockLevels[itemId];

    if (newStock === '' || newStock === undefined || isNaN(Number(newStock))) {
        toast({
            variant: "destructive",
            title: "Invalid Input",
            description: "Please enter a valid number for the stock.",
        });
        return;
    }

    const itemDocRef = doc(firestore, 'menuItems', itemId);
    const updateData = { 
        stock: Number(newStock),
        updatedAt: serverTimestamp(),
      };
    
    updateDoc(itemDocRef, updateData)
        .then(() => {
          toast({
            title: "Stock Updated",
            description: `The stock level has been successfully updated.`,
          });
          // Clear the input for this item
          setStockLevels(prev => ({...prev, [itemId]: ''}));
        })
        .catch(error => {
          console.error("Error updating stock:", error);
          const permissionError = new FirestorePermissionError({ path: itemDocRef.path, operation: 'update', requestResourceData: updateData });
          errorEmitter.emit('permission-error', permissionError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update stock level.",
          });
        });
  };
  
  if (!currentUser) {
     return (
       <div className="space-y-6">
        <div className="flex justify-between items-start">
            <Skeleton className="h-12 w-1/2" />
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Update stock levels for inventoried items.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventoried Items</CardTitle>
          <CardDescription>View and manage stock for items that require inventory tracking.</CardDescription>
           <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for an item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full max-w-sm"
              />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">
                   <Button variant="ghost" onClick={() => requestSort('name')}>
                    Item Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                   <Button variant="ghost" onClick={() => requestSort('category')}>
                    Category
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                   <Button variant="ghost" onClick={() => requestSort('stock')}>
                    Current Stock
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[30%]">Update Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areItemsLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!areItemsLoading && sortedItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="number"
                        placeholder="New Qty"
                        className="w-24 h-9"
                        value={stockLevels[item.id] ?? ''}
                        onChange={(e) => handleStockChange(item.id, e.target.value)}
                      />
                      <Button size="sm" onClick={() => handleUpdateStock(item.id)}>
                        <Save className="mr-2 h-4 w-4" />
                        Update
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
               {!areItemsLoading && (!sortedItems || sortedItems.length === 0) && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        No inventoried items found.
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
