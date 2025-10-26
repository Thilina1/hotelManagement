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
import type { Room, RoomStatus, RoomType } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { RoomForm } from '@/components/dashboard/room-management/room-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';

const statusColors: Record<RoomStatus, string> = {
    available: 'bg-green-500 text-white',
    occupied: 'bg-yellow-500 text-white',
    cleaning: 'bg-blue-500 text-white',
    maintenance: 'bg-red-500 text-white',
};

const typeColors: Record<RoomType, string> = {
    Single: 'bg-sky-200 text-sky-800',
    Double: 'bg-indigo-200 text-indigo-800',
    Suite: 'bg-purple-200 text-purple-800',
    Family: 'bg-pink-200 text-pink-800',
};


export default function RoomManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const roomsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'rooms');
  }, [firestore]);
  
  const { data: rooms, isLoading: areRoomsLoading } = useCollection<Room>(roomsCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const handleAddRoomClick = () => {
    setEditingRoom(null);
    setIsDialogOpen(true);
  };

  const handleEditRoomClick = (room: Room) => {
    setEditingRoom(room);
    setIsDialogOpen(true);
  };
  
  const handleDeleteRoom = async (id: string) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this room? This cannot be undone.')) {
      deleteDoc(doc(firestore, 'rooms', id))
        .then(() => {
            toast({
                title: 'Room Deleted',
                description: 'The room has been successfully removed.',
            });
        })
        .catch(error => {
            console.error("Error deleting room: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete room.",
            });
        });
    }
  };

  const handleFormSubmit = async (values: Omit<Room, 'id'>) => {
    if (!firestore || !currentUser) return;

    try {
      if (editingRoom) {
        // Update existing room
        await updateDoc(doc(firestore, 'rooms', editingRoom.id), {
          ...values,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Room Updated",
          description: "The room details have been updated.",
        });
      } else {
        // Create new room
        await addDoc(collection(firestore, 'rooms'), {
            ...values,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        toast({
            title: "Room Created",
            description: "A new room has been successfully added.",
        });
      }
      setIsDialogOpen(false);
      setEditingRoom(null);
    } catch (error: any) {
      console.error("Error saving room:", error);
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: `Failed to save room. ${error.message}`,
      });
    }
  };

  // Show a loading skeleton while the user context is loading
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
            <h1 className="text-3xl font-headline font-bold">Room Management</h1>
            <p className="text-muted-foreground">Manage all rooms in the hotel.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingRoom(null);
          setIsDialogOpen(open);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddRoomClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Room
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                </DialogHeader>
                <RoomForm
                    room={editingRoom}
                    onSubmit={handleFormSubmit}
                />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room List</CardTitle>
          <CardDescription>A list of all rooms in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areRoomsLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!areRoomsLoading && rooms && rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.roomNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-medium ${typeColors[room.type]}`}>{room.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`capitalize ${statusColors[room.status]}`}>
                        {room.status}
                    </Badge>
                  </TableCell>
                  <TableCell>LKR {room.price.toFixed(2)}</TableCell>
                   <TableCell>{room.updatedAt ? new Date((room.updatedAt as any).seconds * 1000).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRoomClick(room)}>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteRoom(room.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!areRoomsLoading && (!rooms || rooms.length === 0) && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        No rooms found. Add one to get started.
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
