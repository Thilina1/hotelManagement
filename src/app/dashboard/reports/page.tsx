
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Receipt, Calendar as CalendarIcon, Wallet, CreditCard, Users, BarChart } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Bill, PaymentMethod } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Area, AreaChart, Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useUserContext } from '@/context/user-context';


const paymentMethodIcons: Record<PaymentMethod, React.FC<any>> = {
    cash: Wallet,
    card: CreditCard,
};

const chartConfig = {
  total: {
    label: "Total Sales",
    color: "hsl(var(--primary))",
  },
  bills: {
    label: "Bills Paid",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export default function ReportsPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUserContext();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfDay(today), to: endOfDay(today) });

  const billsInDateRangeQuery = useMemoFirebase(() => {
    if (!firestore || !dateRange?.from || !dateRange?.to) return null;
    return query(
        collection(firestore, 'bills'),
        where('paidAt', '>=', dateRange.from),
        where('paidAt', '<=', dateRange.to)
    );
  }, [firestore, dateRange]);

  const { data: allBills, isLoading } = useCollection<Bill>(billsInDateRangeQuery);

  const bills = useMemo(() => {
    if (!allBills) return [];
    return allBills.filter(bill => bill.status === 'paid');
  }, [allBills]);

  const kpiData = useMemo(() => {
    if (!bills) return { totalRevenue: 0, totalBills: 0, avgBillValue: 0 };
    const totalRevenue = bills.reduce((acc, bill) => acc + bill.total, 0);
    const totalBills = bills.length;
    const avgBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;
    return { totalRevenue, totalBills, avgBillValue };
  }, [bills]);

  const salesByDay = useMemo(() => {
    if (!bills) return [];
    const sales: { [key: string]: { total: number; bills: number } } = {};
    bills.forEach(bill => {
        if (bill.paidAt && (bill.paidAt as Timestamp).seconds) {
            const date = format(new Date((bill.paidAt as Timestamp).seconds * 1000), 'yyyy-MM-dd');
            if (!sales[date]) {
                sales[date] = { total: 0, bills: 0 };
            }
            sales[date].total += bill.total;
            sales[date].bills += 1;
        }
    });
    return Object.entries(sales).map(([date, data]) => ({ date, ...data })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bills]);
  
  if (!currentUser) {
     return (
       <div className="space-y-6">
         <Skeleton className="h-12 w-1/2" />
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
         </div>
         <Skeleton className="h-80 w-full" />
       </div>
     )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-headline font-bold">Reports</h1>
              <p className="text-muted-foreground">Analyze sales and payment history.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className="w-[300px] justify-start text-left font-normal"
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
                 <Button onClick={() => setDateRange({ from: startOfDay(today), to: endOfDay(today) })}>Today</Button>
                 <Button onClick={() => setDateRange({ from: startOfWeek(today), to: endOfWeek(today) })}>This Week</Button>
                 <Button onClick={() => setDateRange({ from: startOfMonth(today), to: endOfMonth(today) })}>This Month</Button>
                 <Button onClick={() => setDateRange({ from: startOfYear(today), to: endOfYear(today) })}>This Year</Button>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">${kpiData.totalRevenue.toFixed(2)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bills Paid</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{kpiData.totalBills}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Bill Value</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">${kpiData.avgBillValue.toFixed(2)}</div>}
            </CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart/> Sales Overview</CardTitle>
                 <CardDescription>A chart showing total sales and number of bills per day.</CardDescription>
            </CardHeader>
             <CardContent>
                 {isLoading && <Skeleton className="h-80 w-full" />}
                 {!isLoading && salesByDay.length > 0 && (
                     <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-80">
                      <RechartsBarChart accessibilityLayer data={salesByDay}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          tickFormatter={(value) => format(new Date(value), 'MMM d')}
                        />
                         <YAxis yAxisId="left" stroke="hsl(var(--primary))" />
                         <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="total" name="Total Sales" fill="var(--color-total)" radius={4} yAxisId="left" />
                        <Bar dataKey="bills" name="Bills Paid" fill="var(--color-bills)" radius={4} yAxisId="right"/>
                      </RechartsBarChart>
                    </ChartContainer>
                 )}
                 {!isLoading && salesByDay.length === 0 && (
                     <div className="h-80 flex items-center justify-center text-muted-foreground">
                         <p>No sales data for the selected period.</p>
                     </div>
                 )}
             </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>A detailed log of all paid bills in the selected date range.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Bill No.</TableHead>
                            <TableHead>Table</TableHead>
                            <TableHead>Waiter</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Paid At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && [...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && bills && bills.map(bill => {
                            const PaymentIcon = bill.paymentMethod ? paymentMethodIcons[bill.paymentMethod] : null;
                            return (
                                <TableRow key={bill.id}>
                                    <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                                    <TableCell className="font-medium">{bill.tableNumber}</TableCell>
                                    <TableCell>{bill.waiterName || 'N/A'}</TableCell>
                                    <TableCell>${bill.total.toFixed(2)}</TableCell>
                                    <TableCell>{bill.discount}%</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize flex gap-1 items-center w-fit">
                                            {PaymentIcon && <PaymentIcon className="w-3 h-3"/>}
                                            {bill.paymentMethod || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {bill.paidAt ? format(new Date((bill.paidAt as Timestamp).seconds * 1000), 'Pp') : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {!isLoading && (!bills || bills.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    No paid bills found for this period.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </>
  );

    
}
