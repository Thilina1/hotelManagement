'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, CreditCard, Users, Activity } from "lucide-react";
import DebugUserInfo from './debug-user-info';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const kpiData = [
  { title: "Total Revenue", value: "$12,450.00", icon: DollarSign, change: "+12.5%", imgId: "login-background" },
  { title: "Active Staff", value: "12", icon: Users, change: "+2", imgId: "avatar-2" },
  { title: "Transactions", value: "340", icon: CreditCard, change: "+8.2%", imgId: "avatar-3" },
  { title: "Server Activity", value: "High", icon: Activity, change: "", imgId: "avatar-4" },
];

export default function AdminDashboard() {
  const images = PlaceHolderImages;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">High-level overview of the restaurant's performance.</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => {
          const image = images.find(img => img.id === kpi.imgId);
          return (
            <Card key={index} className="glassy overflow-hidden relative rounded-2xl">
              {image && (
                <Image 
                  src={image.imageUrl} 
                  alt={kpi.title} 
                  fill 
                  className="object-cover opacity-20"
                />
              )}
              <div className="relative p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                    <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                    <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-0">
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    {kpi.change && <p className="text-xs text-muted-foreground">{kpi.change} from last month</p>}
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Additional charts and info panels can be added here */}
      
      <DebugUserInfo />
    </div>
  );
}
