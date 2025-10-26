
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
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Please select a room.' }),
  guestName: z.string().min(2, { message: 'Guest name is required.' }),
  guestEmail: z.string().email({ message: 'Invalid email address.' }),
  guestContact: z.string().min(10, { message: 'Contact number is required.' }),
  guestNIC: z.string().min(10, { message: 'NIC is required.' }),
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }),
  adults: z.coerce.number().min(1, { message: 'At least one adult is required.' }),
  children: z.coerce.number().min(0),
  status: z.enum(['confirmed', 'checked-in', 'checked-out', 'cancelled']),
});

interface BookingFormProps {
  booking?: Booking | null;
  rooms: Room[];
  onClose: () => void;
}

export function BookingForm({ booking, rooms, onClose }: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: booking?.roomId || '',
      guestName: booking?.guestName || '',
      guestEmail: booking?.guestEmail || '',
      guestContact: booking?.guestContact || '',
      guestNIC: booking?.guestNIC || '',
      dateRange: {
        from: booking?.checkInDate ? new Date(booking.checkInDate) : new Date(),
        to: booking?.checkOutDate ? new Date(booking.checkOutDate) : new Date(),
      },
      adults: booking?.adults || 1,
      children: booking?.children || 0,
      status: booking?.status || 'confirmed',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;

    const selectedRoom = rooms.find(r => r.id === values.roomId);
    if (!selectedRoom) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected room not found.' });
      return;
    }

    const bookingData = {
        ...values,
        bookingNumber: booking?.bookingNumber || `BK-${Date.now()}`,
        roomNumber: selectedRoom.roomNumber,
        checkInDate: values.dateRange.from.toISOString(),
        checkOutDate: values.dateRange.to.toISOString(),
    };
    
    // remove dateRange from data
    delete (bookingData as any).dateRange;

    try {
      if (booking) {
        // Update existing booking
        await updateDoc(doc(firestore, 'bookings', booking.id), bookingData);
        toast({ title: 'Booking Updated', description: 'The booking has been successfully updated.' });
      } else {
        // Create new booking
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
                      {room.roomNumber} ({room.type}) - LKR {room.pricePerNight}/night
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Booking Dates</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value?.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, "LLL dd, y")} -{" "}
                            {format(field.value.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(field.value.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={field.value?.from}
                    selected={field.value as DateRange}
                    onSelect={field.onChange}
                    numberOfMonths={2}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
              name="guestContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl><Input placeholder="0771234567" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guestNIC"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIC / Passport</FormLabel>
                  <FormControl><Input placeholder="National ID or Passport" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="adults"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adults</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="children"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Children</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
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

    