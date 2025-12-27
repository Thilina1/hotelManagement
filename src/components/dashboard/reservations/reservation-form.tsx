
'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import type { Reservation, Room } from '@/lib/types';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useMemo } from 'react';
import { DateRangePickerModal } from '../bookings/date-range-picker-modal';
import { format, differenceInCalendarDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';

const itemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
});

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Please select a room.' }),
  guestName: z.string().min(2, { message: 'Guest name is required.' }),
  guestEmail: z.string().email({ message: 'Invalid email address.' }),
  dateRange: z.object({
      from: z.date().optional(),
      to: z.date().optional(),
  }).refine(data => data.from, { message: "Check-in date is required.", path: ["from"] }),
  numberOfGuests: z.coerce.number().min(1, { message: 'At least one guest is required.' }),
  specialRequests: z.string().optional(),
  status: z.enum(['booked', 'confirmed', 'checked-in', 'checked-out', 'cancelled']),
  items: z.array(itemSchema),
  totalCost: z.coerce.number(),
}).refine(data => data.dateRange.from && data.dateRange.to && data.dateRange.to >= data.dateRange.from, {
  message: "Check-out date must be on or after check-in date.",
  path: ["dateRange"],
});

interface ReservationFormProps {
  reservation?: Reservation | null;
  rooms: Room[];
  onClose: () => void;
}

export function ReservationForm({ reservation, rooms, onClose }: ReservationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const initialDateRange = useMemo(() => {
    if (reservation?.checkInDate && reservation?.checkOutDate) {
      const from = new Date(reservation.checkInDate);
      from.setUTCHours(12,0,0,0);
      const to = new Date(reservation.checkOutDate);
      to.setUTCHours(12,0,0,0);
      return { from, to };
    }
    return { from: undefined, to: undefined };
  }, [reservation]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: reservation?.roomId || '',
      guestName: reservation?.guestName || '',
      guestEmail: reservation?.guestEmail || '',
      dateRange: initialDateRange,
      numberOfGuests: reservation?.numberOfGuests || 1,
      specialRequests: reservation?.specialRequests || '',
      status: reservation?.status || 'booked',
      items: reservation?.items || [],
      totalCost: reservation?.totalCost || 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  
  useEffect(() => {
    const total = watchedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    form.setValue('totalCost', total, { shouldValidate: true });
  }, [watchedItems, form]);

  const handleAddRoomToItems = () => {
    const { roomId, dateRange } = form.getValues();
    if (roomId && dateRange?.from && dateRange?.to) {
        const selectedRoom = rooms.find(r => r.id === roomId);
        if (selectedRoom) {
            const dayDiff = differenceInCalendarDays(dateRange.to, dateRange.from);
            const numberOfNights = dayDiff >= 0 ? dayDiff + 1 : 1;
            
            append({
                description: `${selectedRoom.title} - ${numberOfNights} night(s)`,
                quantity: numberOfNights,
                price: selectedRoom.pricePerNight,
            });
            return;
        }
    }
    toast({ variant: 'destructive', title: 'Error', description: 'Please select a room and a valid date range first.'});
  };

  const handleDateSave = (range: DateRange | undefined) => {
    if (range) {
        form.setValue('dateRange', range, { shouldValidate: true });
    }
    setIsDatePickerOpen(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user || !values.dateRange.from || !values.dateRange.to) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save reservation. Check-in and Check-out dates are required.' });
        return;
    };

    const selectedRoom = rooms.find(r => r.id === values.roomId);
    if (!selectedRoom) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected room not found.' });
      return;
    }

    const reservationData = {
        ...values,
        bookingDate: reservation?.bookingDate || serverTimestamp(),
        checkInDate: values.dateRange.from.toISOString().split('T')[0], // YYYY-MM-DD
        checkOutDate: values.dateRange.to.toISOString().split('T')[0], // YYYY-MM-DD
        roomTitle: selectedRoom.title,
        guestId: reservation?.guestId || user.uid,
    };
    
    delete (reservationData as any).dateRange;

    try {
      if (reservation) {
        await updateDoc(doc(firestore, 'reservations', reservation.id), reservationData);
        toast({ title: 'Reservation Updated', description: 'The reservation has been successfully updated.' });
      } else {
        await addDoc(collection(firestore, 'reservations'), reservationData);
        toast({ title: 'Reservation Created', description: 'A new reservation has been successfully created.' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving reservation:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save reservation.' });
    }
  };
  
  const availableRooms = rooms.filter(room => room.status === 'available' || room.id === reservation?.roomId);
  const dateRange = form.watch('dateRange');
  const dayCount = dateRange.from && dateRange.to ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1 : 0;

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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!reservation && reservation.status !== 'booked' && reservation.status !== 'confirmed'}>
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
            <div className="flex justify-between items-center">
                <FormLabel>Booking Dates</FormLabel>
                {dayCount > 0 && <span className="text-sm font-medium text-muted-foreground">{dayCount} night(s)</span>}
            </div>
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
          name="specialRequests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Requests</FormLabel>
              <FormControl><Textarea placeholder="Any special requests or notes..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />
        
        <div>
          <h3 className="text-lg font-medium mb-2">Billable Items</h3>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center p-2 border rounded-md">
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => <Input {...field} placeholder="Item description" />}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => <Input type="number" {...field} className="w-20" placeholder="Qty"/>}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.price`}
                  render={({ field }) => <Input type="number" {...field} className="w-24" placeholder="Price" />}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
                 <Button type="button" variant="outline" onClick={handleAddRoomToItems} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Room Stay
                </Button>
                <Button type="button" variant="secondary" onClick={() => append({ description: '', quantity: 1, price: 0 })} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Item
                </Button>
            </div>
          </div>
        </div>
        
         <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reservation Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="booked">Booked</SelectItem>
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
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Total Cost:</span>
            <span>LKR {form.getValues('totalCost').toFixed(2)}</span>
          </div>
        </div>


        <Button type="submit" className="w-full">
            {reservation ? 'Update Reservation' : 'Create Reservation'}
        </Button>
      </form>
    </Form>
    <DateRangePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSave={handleDateSave}
        initialDateRange={form.getValues('dateRange')}
        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) && !reservation}
    />
    </>
  );
}
