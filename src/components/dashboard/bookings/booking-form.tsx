
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import type { Booking, Room } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Please select a room.' }),
  guestName: z.string().min(2, { message: 'Guest name is required.' }),
  guestEmail: z.string().email({ message: 'Invalid email address.' }),
  checkInDate: z.date({ required_error: "Check-in date is required."}),
  checkOutDate: z.date({ required_error: "Check-out date is required."}),
  numberOfGuests: z.coerce.number().min(1, { message: 'At least one guest is required.' }),
  totalCost: z.coerce.number().min(0),
  specialRequests: z.string().optional(),
  status: z.enum(['confirmed', 'checked-in', 'checked-out', 'cancelled']),
}).refine(data => data.checkOutDate > data.checkInDate, {
  message: "Check-out date must be after check-in date.",
  path: ["checkOutDate"],
});


interface BookingFormProps {
  booking?: Booking | null;
  rooms: Room[];
  onClose: () => void;
}

export function BookingForm({ booking, rooms, onClose }: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: booking?.roomId || '',
      guestName: booking?.guestName || '',
      guestEmail: booking?.guestEmail || '',
      checkInDate: booking?.checkInDate ? new Date(booking.checkInDate) : undefined,
      checkOutDate: booking?.checkOutDate ? new Date(booking.checkOutDate) : undefined,
      numberOfGuests: booking?.numberOfGuests || 1,
      totalCost: booking?.totalCost || 0,
      specialRequests: booking?.specialRequests || '',
      status: booking?.status || 'confirmed',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user ) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save booking.' });
        return;
    };

    const selectedRoom = rooms.find(r => r.id === values.roomId);
    if (!selectedRoom) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected room not found.' });
      return;
    }

    const bookingData = {
        ...values,
        bookingDate: booking?.bookingDate || new Date().toISOString(),
        checkInDate: values.checkInDate.toISOString().split('T')[0], // YYYY-MM-DD
        checkOutDate: values.checkOutDate.toISOString().split('T')[0], // YYYY-MM-DD
        roomTitle: selectedRoom.title,
        guestId: reservation?.guestId || user.uid, // Persist guestId on edit
    };
    
    try {
      if (booking) {
        // Update existing reservation
        await updateDoc(doc(firestore, 'bookings', booking.id), bookingData);
        toast({ title: 'Booking Updated', description: 'The booking has been successfully updated.' });
      } else {
        // Create new reservation
        await addDoc(collection(firestore, 'bookings'), bookingData);
        toast({ title: 'Booking Created', description: 'A new booking has been successfully created.' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving booking:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save booking.' });
    }
  };
  
  const availableRooms = rooms.filter(room => room.status === 'available' || room.id === booking?.roomId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="roomId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!booking && booking.status !== 'confirmed'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableRooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.title} ({room.type}) - LKR {room.pricePerNight}/night
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkInDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-in Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) && !booking}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="checkOutDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-out Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < (form.getValues('checkInDate') || new Date()) && !booking}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guestEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Email</FormLabel>
                  <FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="numberOfGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Guests</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Cost (LKR)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g. 30000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
         <FormField
              control={form.control}
              name="specialRequests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Requests</FormLabel>
                  <FormControl><Textarea placeholder="Any special requests or notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
         <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="checked-in">Checked-In</SelectItem>
                      <SelectItem value="checked-out">Checked-Out</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

        <Button type="submit" className="w-full">
            {booking ? 'Update Booking' : 'Create Booking'}
        </Button>
      </form>
    </Form>
  );
}

    