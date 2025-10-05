"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard as CreditCardIcon, CheckCircle, Clock } from "lucide-react";

const stats = [
    { title: "Today's Revenue", value: "$4,250.75", icon: DollarSign },
    { title: "Pending Payments", value: "3", icon: Clock },
    { title: "Completed Transactions", value: "58", icon: CheckCircle },
    { title: "Avg. Transaction", value: "$73.29", icon: CreditCardIcon },
];

const recentTransactions = [
    { id: 'TXN123', table: 3, amount: '$88.50', method: 'Credit Card', status: 'Completed' },
    { id: 'TXN124', table: 1, amount: '$124.00', method: 'Cash', status: 'Completed' },
    { id: 'TXN125', table: 7, amount: '$45.25', method: 'Credit Card', status: 'Pending' },
    { id: 'TXN126', table: 5, amount: '$67.80', method: 'Debit Card', status: 'Completed' },
];

const statusBadge: Record<string, string> = {
    'Completed': 'bg-green-500 text-white',
    'Pending': 'bg-yellow-500 text-white',
}

export default function PaymentDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Payment Dashboard</h1>
        <p className="text-muted-foreground">Track transactions and manage payments.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
            </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>A list of the most recent payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="font-mono text-sm">{txn.id}</TableCell>
                  <TableCell>{txn.table}</TableCell>
                  <TableCell className="font-medium">{txn.amount}</TableCell>
                  <TableCell>{txn.method}</TableCell>
                  <TableCell>
                      <Badge className={statusBadge[txn.status]}>{txn.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
