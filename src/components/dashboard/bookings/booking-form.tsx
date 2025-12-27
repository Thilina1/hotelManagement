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
import type { Booking, Room } from '@/lib/types';
import { format, differenceInCalendarDays } from 'date-fns';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useState, useMemo, useCallback } from 'react';
import { DateRangePickerModal } from './date-range-picker-modal';
import { CalendarIcon, TrendingUp } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Please select a room.' }),
  guestName: z.string().min(2, { message: 'Guest name is required.' }),
  guestEmail: z.string().email({ message: 'Invalid email address.' }),
  dateRange: z.object({
      from: z.date().optional(),
      to: z.date().optional(),
  }).refine(data => data.from, { message: "Check-in date is required.", path: ["from"] }),
  numberOfGuests: z.coerce.number().min(1, { message: 'At least one guest is required.' }),
  totalCost: z.coerce.number(),
  specialRequests: z.string().optional(),
  status: z.enum(['confirmed', 'checked-in', 'checked-out', 'cancelled']),
}).refine(data => data.dateRange.from && data.dateRange.to && data.dateRange.to > data.dateRange.from, {
  message: "Check-out date must be after check-in date.",
  path: ["dateRange"],
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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState<number | null>(booking?.totalCost || null);


  // Parse booking dates correctly for the form's default values
  const initialDateRange = useMemo(() => {
    if (booking?.checkInDate && booking?.checkOutDate) {
      // Create date objects from string, accounting for timezone by setting time to noon
      const from = new Date(booking.checkInDate);
      from.setHours(12,0,0,0);
      const to = new Date(booking.checkOutDate);
      to.setHours(12,0,0,0);
      return { from, to };
    }
    return { from: undefined, to: undefined };
  }, [booking]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: booking?.roomId || '',
      guestName: booking?.guestName || '',
      guestEmail: booking?.guestEmail || '',
      dateRange: initialDateRange,
      numberOfGuests: booking?.numberOfGuests || 1,
      totalCost: booking?.totalCost || 0,
      specialRequests: booking?.specialRequests || '',
      status: booking?.status || 'confirmed',
    },
  });

  const handleCalculateCost = () => {
    const { roomId, dateRange } = form.getValues();
    if (roomId && dateRange?.from && dateRange?.to) {
        const selectedRoom = rooms.find(r => r.id === roomId);
        if (selectedRoom) {
            const numberOfNights = differenceInCalendarDays(dateRange.to, dateRange.from);
            if (numberOfNights > 0) {
                const cost = numberOfNights * selectedRoom.pricePerNight;
                setCalculatedCost(cost);
                form.setValue('totalCost', cost, { shouldValidate: true });
                toast({ title: 'Cost Calculated', description: `Total cost is LKR ${cost.toFixed(2)} for ${numberOfNights} night(s).`});
                return;
            }
        }
    }
    setCalculatedCost(0);
    form.setValue('totalCost', 0);
    toast({ variant: 'destructive', title: 'Calculation Error', description: 'Please select a room and a valid date range.'});
  };

  const handleDateSave = (range: DateRange | undefined) => {
    if (range) {
        form.setValue('dateRange', range, { shouldValidate: true });
    }
    setIsDatePickerOpen(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user || !values.dateRange.from || !values.dateRange.to) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save booking. Check-in and Check-out dates are required.' });
        return;
    };

    if (values.totalCost <= 0 && calculatedCost === null) {
        toast({ variant: 'destructive', title: 'Missing Cost', description: 'Please calculate the total cost before creating the booking.' });
        return;
    }

    const selectedRoom = rooms.find(r => r.id === values.roomId);
    if (!selectedRoom) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected room not found.' });
      return;
    }

    const bookingData = {
        ...values,
        bookingDate: booking?.bookingDate || serverTimestamp(),
        checkInDate: values.dateRange.from.toISOString().split('T')[0], // YYYY-MM-DD
        checkOutDate: values.dateRange.to.toISOString().split('T')[0], // YYYY-MM-DD
        roomTitle: selectedRoom.title,
        guestId: booking?.guestId || user.uid,
    };
    
    // Remove dateRange from the final object to be saved
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
  const dateRange = form.watch('dateRange');

  return (
    <>
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
        
        <div className="space-y-2">
            <FormLabel>Booking Dates</FormLabel>
            <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setIsDatePickerOpen(true)}
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`
                : <span>Select check-in and check-out dates</span>
                }
            </Button>
            {form.formState.errors.dateRange && <FormMessage>{form.formState.errors.dateRange.message || form.formState.errors.dateRange.from?.message}</FormMessage>}
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
            {/* Hidden total cost input, the value is displayed below */}
            <FormField
              control={form.control}
              name="totalCost"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormLabel>Total Cost (LKR)</FormLabel>
                  <FormControl><Input type="number" {...field} readOnly /></FormControl>
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
        
        <div className="p-4 border-t space-y-4">
          <Button type="button" variant="outline" className="w-full" onClick={handleCalculateCost}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Calculate Total Cost
          </Button>

          {calculatedCost !== null && (
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
              <p className="text-2xl font-bold">LKR {calculatedCost.toFixed(2)}</p>
            </div>
          )}
        </div>


        <Button type="submit" className="w-full">
            {booking ? 'Update Booking' : 'Create Booking'}
        </Button>
      </form>
    </Form>
    <DateRangePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSave={handleDateSave}
        initialDateRange={form.getValues('dateRange')}
        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) && !booking}
    />
    </>
  );
}
