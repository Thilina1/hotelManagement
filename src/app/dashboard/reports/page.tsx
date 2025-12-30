
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Receipt, Calendar as CalendarIcon, Wallet, CreditCard, Users, BarChart, BedDouble, Banknote, LandPlot } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Bill, PaymentMethod, Reservation, Expense, OtherIncome } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useUserContext } from '@/context/user-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const paymentMethodIcons: Record<PaymentMethod, React.FC<any>> = {
    cash: Wallet,
    card: CreditCard,
};

const salesChartConfig = {
  total: {
    label: "Total Sales",
    color: "hsl(var(--primary))",
  },
  bills: {
    label: "Bills Paid",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

const bookingChartConfig = {
  total: {
    label: "Booking Revenue",
    color: "hsl(var(--chart-2))",
  },
  bookings: {
    label: "Bookings",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const otherIncomeChartConfig = {
  total: {
    label: "Total Income",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;


export default function ReportsPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUserContext();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfDay(today), to: endOfDay(today) });

  // Queries
  const billsInDateRangeQuery = useMemoFirebase(() => {
    if (!firestore || !dateRange?.from || !dateRange?.to) return null;
    return query(
        collection(firestore, 'bills'),
        where('paidAt', '>=', dateRange.from),
        where('paidAt', '<=', dateRange.to)
    );
  }, [firestore, dateRange]);

  const reservationsInDateRangeQuery = useMemoFirebase(() => {
    if (!firestore || !dateRange?.from || !dateRange?.to) return null;
    return query(
      collection(firestore, 'reservations'),
      where('checkInDate', '>=', format(dateRange.from, 'yyyy-MM-dd')),
      where('checkInDate', '<=', format(dateRange.to, 'yyyy-MM-dd'))
    );
  }, [firestore, dateRange]);

  const otherIncomesInDateRangeQuery = useMemoFirebase(() => {
    if (!firestore || !dateRange?.from || !dateRange?.to) return null;
    return query(
        collection(firestore, 'otherIncomes'),
        where('date', '>=', format(dateRange.from, 'yyyy-MM-dd')),
        where('date', '<=', format(dateRange.to, 'yyyy-MM-dd'))
    );
  }, [firestore, dateRange]);

  const { data: allBills, isLoading: isLoadingBills } = useCollection<Bill>(billsInDateRangeQuery);
  const { data: allReservations, isLoading: isLoadingReservations } = useCollection<Reservation>(reservationsInDateRangeQuery);
  const { data: allOtherIncomes, isLoading: isLoadingOtherIncomes } = useCollection<OtherIncome>(otherIncomesInDateRangeQuery);

  const isLoading = isLoadingBills || isLoadingReservations || isLoadingOtherIncomes;

  // Restaurant Sales Data
  const paidBills = useMemo(() => {
    if (!allBills) return [];
    return allBills.filter(bill => bill.status === 'paid');
  }, [allBills]);

  const salesKpiData = useMemo(() => {
    if (!paidBills) return { totalRevenue: 0, totalBills: 0, avgBillValue: 0 };
    const totalRevenue = paidBills.reduce((acc, bill) => acc + bill.total, 0);
    const totalBills = paidBills.length;
    const avgBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;
    return { totalRevenue, totalBills, avgBillValue };
  }, [paidBills]);

  const salesByDay = useMemo(() => {
    if (!paidBills) return [];
    const sales: { [key: string]: { total: number; bills: number } } = {};
    paidBills.forEach(bill => {
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
  }, [paidBills]);
  
  // Booking Revenue Data
  const completedBookings = useMemo(() => {
      if (!allReservations) return [];
      return allReservations.filter(res => res.status === 'checked-out' || res.status === 'confirmed' || res.status === 'checked-in');
  }, [allReservations]);

  const bookingKpiData = useMemo(() => {
      if (!completedBookings) return { totalRevenue: 0, totalBookings: 0, avgBookingValue: 0 };
      const totalRevenue = completedBookings.reduce((acc, res) => acc + res.totalCost, 0);
      const totalBookings = completedBookings.length;
      const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
      return { totalRevenue, totalBookings, avgBookingValue };
  }, [completedBookings]);

  const bookingsByDay = useMemo(() => {
      if (!completedBookings) return [];
      const bookingsData: { [key: string]: { total: number; bookings: number } } = {};
      completedBookings.forEach(res => {
          if (res.checkInDate) {
              const date = format(new Date(res.checkInDate), 'yyyy-MM-dd');
              if (!bookingsData[date]) {
                  bookingsData[date] = { total: 0, bookings: 0 };
              }
              bookingsData[date].total += res.totalCost;
              bookingsData[date].bookings += 1;
          }
      });
      return Object.entries(bookingsData).map(([date, data]) => ({ date, ...data })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [completedBookings]);
  
  // Other Incomes Data
  const otherIncomesKpiData = useMemo(() => {
    if (!allOtherIncomes) return { totalIncome: 0, totalRecords: 0 };
    const totalIncome = allOtherIncomes.reduce((acc, income) => acc + income.price, 0);
    const totalRecords = allOtherIncomes.length;
    return { totalIncome, totalRecords };
  }, [allOtherIncomes]);

  const otherIncomesByDay = useMemo(() => {
      if (!allOtherIncomes) return [];
      const incomesData: { [key: string]: { total: number } } = {};
      allOtherIncomes.forEach(income => {
          if (income.date) {
              const date = format(new Date(income.date), 'yyyy-MM-dd');
              if (!incomesData[date]) {
                  incomesData[date] = { total: 0 };
              }
              incomesData[date].total += income.price;
          }
      });
      return Object.entries(incomesData).map(([date, data]) => ({ date, ...data })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allOtherIncomes]);

  
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Reports</h1>
            <p className="text-muted-foreground">Analyze sales and booking history.</p>
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
      <Tabs defaultValue="restaurant">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="restaurant">
                <Receipt className="mr-2 h-4 w-4" />
                Restaurant Sales
            </TabsTrigger>
            <TabsTrigger value="bookings">
                <BedDouble className="mr-2 h-4 w-4" />
                Booking Revenue
            </TabsTrigger>
            <TabsTrigger value="other-incomes">
                <Banknote className="mr-2 h-4 w-4" />
                Other Incomes
            </TabsTrigger>
        </TabsList>
        <TabsContent value="restaurant" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">LKR {salesKpiData.totalRevenue.toFixed(2)}</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bills Paid</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{salesKpiData.totalBills}</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Bill Value</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">LKR {salesKpiData.avgBillValue.toFixed(2)}</div>}
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
                        <ChartContainer config={salesChartConfig} className="min-h-[200px] w-full h-80">
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
                            {!isLoading && paidBills && paidBills.map(bill => {
                                const PaymentIcon = bill.paymentMethod ? paymentMethodIcons[bill.paymentMethod] : null;
                                return (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                                        <TableCell className="font-medium">{bill.tableNumber}</TableCell>
                                        <TableCell>{bill.waiterName || 'N/A'}</TableCell>
                                        <TableCell>LKR {bill.total.toFixed(2)}</TableCell>
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
                            {!isLoading && (!paidBills || paidBills.length === 0) && (
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
        </TabsContent>
        <TabsContent value="bookings" className="space-y-6">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Booking Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">LKR {bookingKpiData.totalRevenue.toFixed(2)}</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <BedDouble className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{bookingKpiData.totalBookings}</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">LKR {bookingKpiData.avgBookingValue.toFixed(2)}</div>}
                </CardContent>
              </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart/> Booking Revenue Overview</CardTitle>
                    <CardDescription>A chart showing total booking revenue per day.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && <Skeleton className="h-80 w-full" />}
                    {!isLoading && bookingsByDay.length > 0 && (
                        <ChartContainer config={bookingChartConfig} className="min-h-[200px] w-full h-80">
                          <RechartsBarChart accessibilityLayer data={bookingsByDay}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              tickFormatter={(value) => format(new Date(value), 'MMM d')}
                            />
                            <YAxis yAxisId="left" stroke="hsl(var(--chart-2))" />
                            <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-3))" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="total" name="Booking Revenue" fill="var(--color-total)" radius={4} yAxisId="left" />
                            <Bar dataKey="bookings" name="Bookings" fill="var(--color-bookings)" radius={4} yAxisId="right"/>
                          </RechartsBarChart>
                        </ChartContainer>
                    )}
                    {!isLoading && bookingsByDay.length === 0 && (
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                            <p>No booking data for the selected period.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Booking History</CardTitle>
                    <CardDescription>A detailed log of all bookings in the selected date range.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Guest</TableHead>
                                <TableHead>Room</TableHead>
                                <TableHead>Check-in</TableHead>
                                <TableHead>Check-out</TableHead>
                                <TableHead>Total Cost</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && completedBookings.map(res => (
                                <TableRow key={res.id}>
                                    <TableCell className="font-medium">{res.guestName}</TableCell>
                                    <TableCell>{res.roomTitle}</TableCell>
                                    <TableCell>{format(new Date(res.checkInDate), 'PPP')}</TableCell>
                                    <TableCell>{format(new Date(res.checkOutDate), 'PPP')}</TableCell>
                                    <TableCell>LKR {res.totalCost.toFixed(2)}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{res.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && completedBookings.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No bookings found for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="other-incomes" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Other Income</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">LKR {otherIncomesKpiData.totalIncome.toFixed(2)}</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                  <LandPlot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{otherIncomesKpiData.totalRecords}</div>}
                </CardContent>
              </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart/> Other Income Overview</CardTitle>
                    <CardDescription>A chart showing total other income per day.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && <Skeleton className="h-80 w-full" />}
                    {!isLoading && otherIncomesByDay.length > 0 && (
                        <ChartContainer config={otherIncomeChartConfig} className="min-h-[200px] w-full h-80">
                          <RechartsBarChart accessibilityLayer data={otherIncomesByDay}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              tickFormatter={(value) => format(new Date(value), 'MMM d')}
                            />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="total" name="Total Income" fill="var(--color-total)" radius={4} />
                          </RechartsBarChart>
                        </ChartContainer>
                    )}
                    {!isLoading && otherIncomesByDay.length === 0 && (
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                            <p>No other income data for the selected period.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Other Income History</CardTitle>
                    <CardDescription>A detailed log of all other incomes in the selected date range.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Name/Reference</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Remark</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && allOtherIncomes && allOtherIncomes.map(income => (
                                <TableRow key={income.id}>
                                    <TableCell>{format(new Date(income.date), 'PPP')}</TableCell>
                                    <TableCell className="font-medium">{income.name}</TableCell>
                                    <TableCell>LKR {income.price.toFixed(2)}</TableCell>
                                    <TableCell>{income.remark}</TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && (!allOtherIncomes || allOtherIncomes.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        No other incomes found for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
