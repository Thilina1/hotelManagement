
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
import type { Expense } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, addDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';
import { ExpenseForm } from '@/components/dashboard/expenses/expense-form';
import { format } from 'date-fns';

export default function ExpenseManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const expensesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'expenses'), orderBy('date', 'desc'));
  }, [firestore]);
  
  const { data: expenses, isLoading: areExpensesLoading } = useCollection<Expense>(expensesQuery);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleAddExpenseClick = () => {
    setEditingExpense(null);
    setIsDialogOpen(true);
  };

  const handleEditExpenseClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };
  
  const handleDeleteExpense = async (id: string) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this expense? This cannot be undone.')) {
      deleteDoc(doc(firestore, 'expenses', id))
        .then(() => {
            toast({
                title: 'Expense Deleted',
                description: 'The expense has been successfully removed.',
            });
        })
        .catch(error => {
            console.error("Error deleting expense: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete expense.",
            });
        });
    }
  };

  const handleFormSubmit = async (values: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) return;
  
    if (editingExpense) {
        updateDoc(doc(firestore, 'expenses', editingExpense.id), {
          ...values,
          updatedAt: serverTimestamp(),
        })
            .then(() => {
                toast({
                  title: "Expense Updated",
                  description: "The expense details have been updated.",
                });
            })
            .catch(error => {
                console.error("Error updating expense: ", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to update expense.",
                });
            });
    } else {
        addDoc(collection(firestore, 'expenses'), {
          ...values,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
            .then(() => {
                toast({
                  title: "Expense Added",
                  description: "A new expense has been successfully added.",
                });
            })
            .catch(error => {
                console.error("Error creating expense: ", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to create expense.",
                });
            });
    }
    setIsDialogOpen(false);
    setEditingExpense(null);
  };
  
  const getFormattedDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      date.setUTCHours(12,0,0,0);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return format(date, 'PPP');
    } catch {
        return 'Invalid Date';
    }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Expense Management</h1>
            <p className="text-muted-foreground">Track all your business expenses.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingExpense(null);
          setIsDialogOpen(open);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddExpenseClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                </DialogHeader>
                <ExpenseForm
                    expense={editingExpense}
                    onSubmit={handleFormSubmit}
                />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>A list of all recorded expenses.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Name/Reference</TableHead>
                        <TableHead>Price (LKR)</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {areExpensesLoading && (
                        <>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                            <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                            </TableRow>
                        ))}
                        </>
                    )}
                    {!areExpensesLoading && expenses?.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{getFormattedDate(expense.date)}</TableCell>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell>{expense.price.toFixed(2)}</TableCell>
                          <TableCell className="max-w-xs truncate">{expense.remark}</TableCell>
                          <TableCell className="text-right">
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditExpenseClick(expense)}>
                                      <Edit className="mr-2 h-4 w-4"/>
                                      Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteExpense(expense.id)}>
                                      <Trash2 className="mr-2 h-4 w-4"/>
                                      Delete
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                        </TableRow>
                    ))}
                    {!areExpensesLoading && (!expenses || expenses.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                No expenses found. Add one to get started.
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
