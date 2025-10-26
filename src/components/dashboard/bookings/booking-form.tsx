
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import type { Booking, Room } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

const formSchema = z.object({
  guestName: z.string().min(1, 'Guest name is required'),
  guestEmail: z.string().email('Invalid email address'),
  guestNic: z.string().min(1, 'Guest NIC is required'),
  guestPhone: z.string().min(1, 'Guest phone is required'),
  roomId: z.string().min(1, 'Please select a room'),
  adults: z.coerce.number().min(1, 'At least one adult is required'),
  children: z.coerce.number().min(0),
  dates: z.object({
    from: z.date({ required_error: "Check-in date is required."}),
    to: z.date({ required_error: "Check-out date is required."}),
  }).refine(data => data.from && data.to && differenceInCalendarDays(data.to, data.from) >= 0, {
      message: "Check-out date must be after check-in date.",
      path: ["to"],
  }),
  status: z.enum(['confirmed', 'checked-in', 'checked-out', 'cancelled']),
  advancePayment: z.coerce.number().min(0).optional(),
});

type BookingFormValues = z.infer<typeof formSchema>;

interface BookingFormProps {
  booking?: Booking | null;
  onSubmit: (values: Omit<Booking, 'id' | 'roomNumber' | 'totalPrice'> & { totalPrice: number }, originalBooking?: Booking | null) => void;
}

export function BookingForm({ booking, onSubmit }: BookingFormProps) {
  const firestore = useFirestore();
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoomPrice, setSelectedRoomPrice] = useState<number>(0);
  
  const roomsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    const roomStatusQuery = ['available'];
    if (booking?.roomId) {
        // If editing, the current room is also "available" for selection
        roomStatusQuery.push('occupied');
    }
    return query(collection(firestore, 'rooms'), where('status', 'in', roomStatusQuery));
  }, [firestore, booking?.roomId]);

  const { data: rooms, isLoading: areRoomsLoading } = useCollection<Room>(roomsCollection);

  useEffect(() => {
    if (rooms) {
        if (booking?.roomId) {
            const currentBookedRoom = rooms.find(r => r.id === booking.roomId);
            const otherAvailableRooms = rooms.filter(r => r.status === 'available' && r.id !== booking.roomId);
            let finalRooms = [...otherAvailableRooms];
            if (currentBookedRoom) {
                finalRooms.unshift(currentBookedRoom);
            }
             setAvailableRooms(finalRooms);
        } else {
             setAvailableRooms(rooms.filter(r => r.status === 'available'));
        }
    }
  }, [rooms, booking]);
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => ({
      guestName: booking?.guestName || '',
      guestEmail: booking?.guestEmail || '',
      guestNic: booking?.guestNic || '',
      guestPhone: booking?.guestPhone || '',
      roomId: booking?.roomId || '',
      adults: booking?.adults || 1,
      children: booking?.children || 0,
      dates: {
        from: booking?.checkInDate ? (booking.checkInDate as any).seconds ? new Date((booking.checkInDate as any).seconds * 1000) : new Date(booking.checkInDate as string) : new Date(),
        to: booking?.checkOutDate ? (booking.checkOutDate as any).seconds ? new Date((booking.checkOutDate as any).seconds * 1000) : new Date(booking.checkOutDate as string) : addDays(new Date(), 1),
      },
      status: booking?.status || 'confirmed',
      advancePayment: booking?.advancePayment || 0,
    }), [booking]),
  });

  const watchDates = form.watch('dates');
  const watchRoomId = form.watch('roomId');

  useEffect(() => {
    if(watchRoomId) {
        const room = rooms?.find(r => r.id === watchRoomId); // Use `rooms` directly to get price
        setSelectedRoomPrice(room?.price || 0);
    } else {
        setSelectedRoomPrice(0);
    }
  }, [watchRoomId, rooms]);

  const totalPrice = useMemo(() => {
    if (watchDates?.from && watchDates?.to && selectedRoomPrice > 0) {
      const nights = differenceInCalendarDays(watchDates.to, watchDates.from);
      return nights > 0 ? nights * selectedRoomPrice : selectedRoomPrice; // Charge for at least one night
    }
    return 0;
  }, [watchDates, selectedRoomPrice]);
  
  const handleFormSubmit = (values: BookingFormValues) => {
    const submissionData = {
        guestName: values.guestName,
        guestEmail: values.guestEmail,
        guestNic: values.guestNic,
        guestPhone: values.guestPhone,
        roomId: values.roomId,
        checkInDate: values.dates.from,
        checkOutDate: values.dates.to,
        adults: values.adults,
        children: values.children,
        status: values.status,
        totalPrice: totalPrice,
        advancePayment: values.advancePayment,
    };
    onSubmit(submissionData as any, booking);
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            name="guestNic"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Guest NIC</FormLabel>
                <FormControl><Input placeholder="National Identity Card No." {...field} /></FormControl>
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
            <FormField
            control={form.control}
            name="guestPhone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Guest Phone</FormLabel>
                <FormControl><Input placeholder="+1 234 567 890" {...field} /></FormControl>
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
              <FormControl><Input type="number" min="1" {...field} /></FormControl>
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
              <FormControl><Input type="number" min="0" {...field} /></FormControl>
              <FormMessage />
              </FormItem>
          )}
          />
        </div>

        <FormField
            control={form.control}
            name="dates"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Check-in / Check-out Dates</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value.from && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value.from ? (
                            field.value.to ? (
                                <>
                                {format(field.value.from, "LLL dd, yyyy")} -{" "}
                                {format(field.value.to, "LLL dd, yyyy")}
                                </>
                            ) : (
                                format(field.value.from, "LLL dd, yyyy")
                            )
                            ) : (
                            <span>Pick a date range</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={field.value.from}
                            selected={field.value}
                            onSelect={field.onChange}
                            numberOfMonths={2}
                            disabled={{ before: new Date() }}
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="roomId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Room</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger disabled={areRoomsLoading}>
                        <SelectValue placeholder={areRoomsLoading ? "Loading rooms..." : "Select an available room"} />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {availableRooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                           Room {room.roomNumber} ({room.type}) - LKR {room.price}/night
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
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Booking Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
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
        </div>
        
        <FormField
            control={form.control}
            name="advancePayment"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Advance Payment (LKR)</FormLabel>
                <FormControl><Input type="number" min="0" placeholder="0.00" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
        />

        <div className="p-4 bg-muted rounded-md text-right">
            <span className="text-xl font-bold">Total Price: LKR {totalPrice.toFixed(2)}</span>
        </div>
        
        <Button type="submit" className="w-full">
          {booking ? 'Update Booking' : 'Create Booking'}
        </Button>
      </form>
    </Form>
  );
}

    