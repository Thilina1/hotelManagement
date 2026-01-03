'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { LoyaltyDiscount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AddLoyaltyDiscount } from './components/add-loyalty-discount';
import { EditLoyaltyDiscount } from './components/edit-loyalty-discount';

export default function LoyaltyDiscountsPage() {
    const firestore = useFirestore();
    const discountsRef = useMemoFirebase(() => firestore ? collection(firestore, 'loyalty-discounts') : null, [firestore]);
    const { data: discounts, isLoading, error } = useCollection<LoyaltyDiscount>(discountsRef);

    return (
        <div className="container mx-auto p-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Loyalty Discounts</CardTitle>
                        <CardDescription>Manage discount tiers for loyalty customers.</CardDescription>
                    </div>
                    <AddLoyaltyDiscount />
                </CardHeader>
                <CardContent>
                    {isLoading && <p>Loading discounts...</p>}
                    {error && <p className="text-red-500">Error: {error.message}</p>}
                    {discounts && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Points Required</TableHead>
                                    <TableHead>Discount (%)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {discounts.map((discount) => (
                                    <TableRow key={discount.id}>
                                        <TableCell>{discount.name}</TableCell>
                                        <TableCell>{discount.pointsRequired}</TableCell>
                                        <TableCell>{discount.discountPercentage}%</TableCell>
                                        <TableCell>
                                            <Badge variant={discount.isActive ? 'default' : 'destructive'}>
                                                {discount.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <EditLoyaltyDiscount discount={discount} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
