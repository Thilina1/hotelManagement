
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
import type { MenuItem as MenuItemType, MenuCategory } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuItemForm } from '@/components/dashboard/menu-management/menu-item-form';
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
import { Switch } from '@/components/ui/switch';


const menuCategories: MenuCategory[] = ['Sri Lankan', 'Western', 'Bar'];

export default function MenuManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  
  const menuItemsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'menuItems');
  }, [firestore]);

  const { data: menuItems, isLoading: areMenuItemsLoading } = useCollection<MenuItemType>(menuItemsCollection);

  const handleAddItemClick = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEditItemClick = (item: MenuItemType) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };
  
  const handleDeleteItem = (id: string) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this menu item? This cannot be undone.')) {
        deleteDoc(doc(firestore, 'menuItems', id))
            .then(() => {
                toast({
                    title: 'Menu Item Deleted',
                    description: 'The item has been successfully removed from the menu.',
                });
            })
            .catch(error => {
                console.error("Error deleting menu item: ", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to delete menu item.",
                });
            });
    }
  };

  const handleFormSubmit = (values: Omit<MenuItemType, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore || !currentUser) return;
  
    const dataToSave: Partial<Omit<MenuItemType, 'id' | 'createdAt' | 'updatedAt'>> = { ...values };
    if (dataToSave.stockType === 'Non-Inventoried') {
        delete (dataToSave as Partial<MenuItemType>).stock;
    }

    if (editingItem) {
        // Update existing item
        updateDoc(doc(firestore, 'menuItems', editingItem.id), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        })
            .then(() => {
                toast({
                  title: "Menu Item Updated",
                  description: "The item details have been updated.",
                });
            })
            .catch(error => {
                console.error("Error updating menu item: ", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to update menu item.",
                });
            });

    } else {
        // Create new item
        addDoc(collection(firestore, 'menuItems'), {
            ...dataToSave,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        })
            .then(() => {
                toast({
                  title: "Menu Item Created",
                  description: "A new item has been successfully added to the menu.",
                });
            })
            .catch(error => {
                 console.error("Error creating menu item: ", error);
                 toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to create menu item.",
                });
            });
    }
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleAvailabilityChange = (item: MenuItemType, checked: boolean) => {
     if (!firestore) return;
     updateDoc(doc(firestore, 'menuItems', item.id), { availability: checked })
        .then(() => {
             toast({
              title: "Availability Updated",
              description: `${item.name} is now ${checked ? 'available' : 'unavailable'}.`,
            });
        })
        .catch(error => {
             console.error("Error updating availability: ", error);
             toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update item availability.",
            });
        });
  }

  if (!currentUser || areMenuItemsLoading) {
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

  const renderTableForCategory = (category: MenuCategory) => {
    const filteredItems = menuItems?.filter(item => item.category === category);
    return (
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {areMenuItemsLoading && (
                    <>
                    {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                    ))}
                    </>
                )}
                {!areMenuItemsLoading && filteredItems && filteredItems.map((item) => (
                    <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>LKR {item.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.stockType === 'Inventoried' ? item.stock : 'N/A'}
                    </TableCell>
                    <TableCell>
                        <Switch
                            checked={item.availability}
                            onCheckedChange={(checked) => handleAvailabilityChange(item, checked)}
                        />
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
                            <DropdownMenuItem onClick={() => handleEditItemClick(item)}>
                                <Edit className="mr-2 h-4 w-4"/>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteItem(item.id)}>
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                {!areMenuItemsLoading && (!filteredItems || filteredItems.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                            No items found in this category.
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
            <h1 className="text-3xl font-headline font-bold">Menu Management</h1>
            <p className="text-muted-foreground">Manage food and drinks for all menus.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingItem(null);
          setIsDialogOpen(open);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddItemClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Menu Item
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
                </DialogHeader>
                <MenuItemForm
                    item={editingItem}
                    onSubmit={handleFormSubmit}
                />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
          <CardDescription>A list of all items in your menus, organized by category.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue={menuCategories[0]}>
                <TabsList className="grid w-full grid-cols-3">
                    {menuCategories.map(category => (
                         <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
                    ))}
                </TabsList>
                 {menuCategories.map(category => (
                    <TabsContent key={category} value={category}>
                        <Card>
                            <CardContent className="p-0">
                                {renderTableForCategory(category)}
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
