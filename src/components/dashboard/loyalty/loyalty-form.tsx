
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import type { LoyaltyCustomer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Customer name is required.' }),
  mobileNumber: z.string().min(10, { message: 'A valid mobile number is required.' }),
  dob: z.date({
    required_error: "A date of birth is required.",
  }),
  totalLoyaltyPoints: z.coerce.number().min(0, { message: 'Loyalty points must be a positive number.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface LoyaltyFormProps {
  customer?: LoyaltyCustomer | null;
  onSubmit: (values: Omit<LoyaltyCustomer, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function LoyaltyForm({ customer, onSubmit }: LoyaltyFormProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: customer?.name || '',
      mobileNumber: customer?.mobileNumber || '',
      dob: customer?.dob ? new Date(customer.dob) : undefined,
      totalLoyaltyPoints: customer?.totalLoyaltyPoints || 0,
    },
  });

  const handleFormSubmit = (values: FormValues) => {
    onSubmit({
      ...values,
      dob: format(values.dob, 'yyyy-MM-dd'),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mobileNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 0771234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                        field.onChange(date);
                        setIsDatePickerOpen(false);
                    }}
                    captionLayout="dropdown-nav"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                    initialFocus
                    disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                    }
                    defaultMonth={field.value || new Date(new Date().setFullYear(new Date().getFullYear() - 20))}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="totalLoyaltyPoints"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Loyalty Points</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full">
            {customer ? 'Update Customer' : 'Register Customer'}
        </Button>
      </form>
    </Form>
  );
}
