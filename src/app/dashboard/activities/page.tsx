
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
import type { Activity } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityForm } from '@/components/dashboard/activities/activity-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';

export default function ActivityManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const activitiesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'activities');
  }, [firestore]);
  
  const { data: activities, isLoading: areActivitiesLoading } = useCollection<Activity>(activitiesCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const handleAddActivityClick = () => {
    setEditingActivity(null);
    setIsDialogOpen(true);
  };

  const handleEditActivityClick = (activity: Activity) => {
    setEditingActivity(activity);
    setIsDialogOpen(true);
  };
  
  const handleDeleteActivity = async (id: string) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this activity? This cannot be undone.')) {
      deleteDoc(doc(firestore, 'activities', id))
        .then(() => {
            toast({
                title: 'Activity Deleted',
                description: 'The activity has been successfully removed.',
            });
        })
        .catch(error => {
            console.error("Error deleting activity: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete activity.",
            });
        });
    }
  };

  const handleFormSubmit = async (values: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) return;

    const dataToSave = { ...values };
    if (dataToSave.type === 'non-priceable') {
        delete dataToSave.pricePerPerson;
    }
  
    if (editingActivity) {
        updateDoc(doc(firestore, 'activities', editingActivity.id), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        })
            .then(() => {
                toast({
                  title: "Activity Updated",
                  description: "The activity details have been updated.",
                });
            })
            .catch(error => {
                console.error("Error updating activity: ", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to update activity.",
                });
            });
    } else {
        addDoc(collection(firestore, 'activities'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
            .then(() => {
                toast({
                  title: "Activity Created",
                  description: "A new activity has been successfully added.",
                });
            })
            .catch(error => {
                console.error("Error creating activity: ", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to create activity.",
                });
            });
    }
    setIsDialogOpen(false);
    setEditingActivity(null);
  };

  if (!currentUser || areActivitiesLoading) {
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
            <h1 className="text-3xl font-headline font-bold">Activity Management</h1>
            <p className="text-muted-foreground">Manage all activities offered.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingActivity(null);
          setIsDialogOpen(open);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddActivityClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Activity
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
                </DialogHeader>
                <ActivityForm
                    activity={editingActivity}
                    onSubmit={handleFormSubmit}
                />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
          <CardDescription>A list of all available activities.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Price/Person (LKR)</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {areActivitiesLoading && (
                        <>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                            <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                            </TableRow>
                        ))}
                        </>
                    )}
                    {!areActivitiesLoading && activities && activities.map((activity) => (
                        <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.name}</TableCell>
                        <TableCell>
                          <Badge variant={activity.type === 'priceable' ? 'default' : 'secondary'} className="capitalize">{activity.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {activity.type === 'priceable' && activity.pricePerPerson
                            ? activity.pricePerPerson.toFixed(2)
                            : 'N/A'}
                        </TableCell>
                         <TableCell>{activity.updatedAt ? new Date((activity.updatedAt as any).seconds * 1000).toLocaleString() : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditActivityClick(activity)}>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteActivity(activity.id)}>
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                    {!areActivitiesLoading && (!activities || activities.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                No activities found. Add an activity to get started.
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

    