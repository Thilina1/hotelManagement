
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Search, Save, ArrowUpDown, PlusCircle, Edit } from 'lucide-react';
import type { MenuItem as MenuItemType } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp, increment, query, where, addDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';
import { InventoryItemForm } from '@/components/dashboard/inventory-management/inventory-item-form';
import * as z from 'zod';

const menuCategories = ['Sri Lankan', 'Western', 'Bar'] as const;
const stockTypes = ['Inventoried', 'Non-Inventoried'] as const;
const sellTypes = ['Direct', 'Indirect'] as const;
const units = ['kg', 'g', 'l', 'ml'] as const;

const formSchema = z.object({
  name: z.string().min(1, { message: 'Item name is required.' }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  buyingPrice: z.coerce.number().min(0, { message: 'Buying price must be a positive number.' }),
  category: z.enum(menuCategories).optional(),
  availability: z.boolean(),
  stockType: z.enum(stockTypes),
  stock: z.coerce.number().optional(),
  varietyOfDishesh: z.string().optional(),
  sellType: z.enum(sellTypes).default('Direct'),
  unit: z.enum(units).optional(),
});


type SortKey = keyof Pick<MenuItemType, 'name' | 'stock'>;

export default function InventoryManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [stockLevels, setStockLevels] = useState<Record<string, number | string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);


  const inventoryItemsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'menuItems'), where('stockType', '==', 'Inventoried'));
  }, [firestore]);

  const { data: inventoryItems, isLoading: areItemsLoading } = useCollection<MenuItemType>(inventoryItemsCollection);

  const varietyOfDishesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'varietyOfDishesh');
  }, [firestore]);

  const { data: varietyOfDishes, isLoading: areVarietyOfDishesLoading } = useCollection(varietyOfDishesCollection);

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

  const handleUpdateStock = (itemId: string) => {
    if (!firestore) return;
    const stockToAdd = stockLevels[itemId];

    if (stockToAdd === '' || stockToAdd === undefined || isNaN(Number(stockToAdd)) || Number(stockToAdd) === 0) {
        toast({
            variant: "destructive",
            title: "Invalid Input",
            description: "Please enter a valid, non-zero number to add to the stock.",
        });
        return;
    }

    const itemDocRef = doc(firestore, 'menuItems', itemId);
    const updateData = { 
        stock: increment(Number(stockToAdd)),
        updatedAt: serverTimestamp(),
      };
    
    updateDoc(itemDocRef, updateData).then(() => {
        toast({
          title: "Stock Updated",
          description: `Added ${stockToAdd} to the stock.`,
        });
        setStockLevels(prev => ({...prev, [itemId]: ''}));
    }).catch(error => {
        console.error("Error updating stock:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update stock level.",
        });
    });
  };

  const handleAddItemClick = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (item: MenuItemType) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };
  
  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    try {
      const cleanedValues = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined)
      );

      if (editingItem) {
        await updateDoc(doc(firestore, 'menuItems', editingItem.id), {
          ...cleanedValues,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Menu item updated',
          description: `The menu item "${values.name}" has been successfully updated.`,
        });
      } else {
        const newMenuItem = {
          ...cleanedValues,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(firestore, 'menuItems'), newMenuItem);
        toast({
          title: 'Menu item created',
          description: `The menu item "${values.name}" has been successfully created.`,
        });
      }
      setIsFormOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error creating menu item:', error);
      toast({
        variant: 'destructive',
        title: 'Error creating item',
        description: 'An unexpected error occurred.',
      });
    }
  };

  if (!currentUser || areItemsLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Update stock levels for inventoried items.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={isOpen => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setEditingItem(null);
          }
        }}>
          <DialogTrigger asChild>
              <Button onClick={handleAddItemClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Menu Item
              </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update the details for this item.' : 'Fill in the details below to add a new item to the menu.'}
              </DialogDescription>
            </DialogHeader>
            <InventoryItemForm 
                item={editingItem}
                onSubmit={handleFormSubmit}
                varietyOfDishes={varietyOfDishes || []} 
            />
          </DialogContent>
        </Dialog>
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
                   <Button variant="ghost" onClick={() => requestSort('stock')}>
                    Current Stock
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
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
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(item)}>
                      <Edit className="mr-2 h-4 w-4" />
                      View / Edit
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="number"
                        placeholder="Add Qty"
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
