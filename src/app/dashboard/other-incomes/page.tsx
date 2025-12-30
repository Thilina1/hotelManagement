
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import type { OtherIncome } from '@/lib/types';
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
import { OtherIncomeForm } from '@/components/dashboard/other-incomes/other-income-form';
import { format } from 'date-fns';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 20;

export default function OtherIncomesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const incomesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'otherIncomes'), orderBy('date', 'desc'));
  }, [firestore]);
  
  const { data: incomes, isLoading: areIncomesLoading } = useCollection<OtherIncome>(incomesQuery);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<OtherIncome | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = incomes ? Math.ceil(incomes.length / ITEMS_PER_PAGE) : 0;
  const paginatedIncomes = incomes?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleAddIncomeClick = () => {
    setEditingIncome(null);
    setIsDialogOpen(true);
  };

  const handleEditIncomeClick = (income: OtherIncome) => {
    setEditingIncome(income);
    setIsDialogOpen(true);
  };
  
  const handleDeleteIncome = async (id: string) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this income record? This cannot be undone.')) {
      deleteDoc(doc(firestore, 'otherIncomes', id))
        .then(() => {
            toast({
                title: 'Income Deleted',
                description: 'The income record has been successfully removed.',
            });
        })
        .catch(error => {
            console.error("Error deleting income: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete income record.",
            });
        });
    }
  };

  const handleFormSubmit = async (values: Omit<OtherIncome, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) return;
  
    if (editingIncome) {
        updateDoc(doc(firestore, 'otherIncomes', editingIncome.id), {
          ...values,
          updatedAt: serverTimestamp(),
        })
            .then(() => {
                toast({
                  title: "Income Updated",
                  description: "The income record has been updated.",
                });
            })
            .catch(error => {
                console.error("Error updating income: ", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to update income record.",
                });
            });
    } else {
        addDoc(collection(firestore, 'otherIncomes'), {
          ...values,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
            .then(() => {
                toast({
                  title: "Income Added",
                  description: "A new income record has been successfully added.",
                });
            })
            .catch(error => {
                console.error("Error creating income: ", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to create income record.",
                });
            });
    }
    setIsDialogOpen(false);
    setEditingIncome(null);
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
            <h1 className="text-3xl font-headline font-bold">Other Income Management</h1>
            <p className="text-muted-foreground">Track all your other business incomes.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingIncome(null);
          setIsDialogOpen(open);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddIncomeClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Income
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingIncome ? 'Edit Income' : 'Add New Income'}</DialogTitle>
                </DialogHeader>
                <OtherIncomeForm
                    income={editingIncome}
                    onSubmit={handleFormSubmit}
                />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Other Incomes</CardTitle>
          <CardDescription>A list of all recorded other incomes.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Name/Reference</TableHead>
                        <TableHead>Amount (LKR)</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {areIncomesLoading && (
                        <>
                        {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
                            <TableRow key={i}>
                            <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                            </TableRow>
                        ))}
                        </>
                    )}
                    {!areIncomesLoading && paginatedIncomes?.map((income) => (
                        <TableRow key={income.id}>
                          <TableCell>{getFormattedDate(income.date)}</TableCell>
                          <TableCell className="font-medium">{income.name}</TableCell>
                          <TableCell>{income.price.toFixed(2)}</TableCell>
                          <TableCell className="max-w-xs truncate">{income.remark}</TableCell>
                          <TableCell className="text-right">
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditIncomeClick(income)}>
                                      <Edit className="mr-2 h-4 w-4"/>
                                      Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteIncome(income.id)}>
                                      <Trash2 className="mr-2 h-4 w-4"/>
                                      Delete
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                        </TableRow>
                    ))}
                    {!areIncomesLoading && (!paginatedIncomes || paginatedIncomes.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                No income records found. Add one to get started.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
         {totalPages > 1 && (
            <CardFooter>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                        </PaginationItem>
                        <PaginationItem>
                            <span className="p-2 text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                        </PaginationItem>
                        <PaginationItem>
                            <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
