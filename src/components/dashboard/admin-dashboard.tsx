'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, CreditCard, Users, Activity } from "lucide-react";
import DebugUserInfo from './debug-user-info';

const kpiData = [
  { title: "Total Revenue", value: "$12,450.00", icon: DollarSign, change: "+12.5%" },
  { title: "Active Staff", value: "12", icon: Users, change: "+2" },
  { title: "Transactions", value: "340", icon: CreditCard, change: "+8.2%" },
  { title: "Server Activity", value: "High", icon: Activity, change: "" },
];

export default function AdminDashboard() {

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">High-level overview of the restaurant's performance.</p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                    <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    {kpi.change && <p className="text-xs text-muted-foreground">{kpi.change} from last month</p>}
                </CardContent>
            </Card>
        ))}
      </div>
      
      {/* Additional charts and info panels can be added here */}
      
      <DebugUserInfo />
    </div>
  );
}