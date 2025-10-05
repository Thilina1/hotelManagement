'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard as CreditCardIcon, CheckCircle, Clock } from "lucide-react";

export default function PaymentDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Payment Dashboard</h1>
        <p className="text-muted-foreground">Track transactions and manage payments.</p>
      </div>
    </div>
  );
}
