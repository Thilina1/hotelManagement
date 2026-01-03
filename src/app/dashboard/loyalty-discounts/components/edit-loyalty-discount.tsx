'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { LoyaltyDiscount } from '@/lib/types';

interface EditLoyaltyDiscountProps {
    discount: LoyaltyDiscount;
}

export function EditLoyaltyDiscount({ discount }: EditLoyaltyDiscountProps) {
    const [name, setName] = useState(discount.name);
    const [pointsRequired, setPointsRequired] = useState(discount.pointsRequired);
    const [discountPercentage, setDiscountPercentage] = useState(discount.discountPercentage);
    const [isActive, setIsActive] = useState(discount.isActive);
    const [isOpen, setIsOpen] = useState(false);

    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        setName(discount.name);
        setPointsRequired(discount.pointsRequired);
        setDiscountPercentage(discount.discountPercentage);
        setIsActive(discount.isActive);
    }, [discount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;

        try {
            const discountRef = doc(firestore, 'loyalty-discounts', discount.id);
            await updateDoc(discountRef, {
                name,
                pointsRequired,
                discountPercentage,
                isActive,
                updatedAt: serverTimestamp(),
            });

            toast({ title: "Discount Updated", description: "The loyalty discount has been updated successfully." });
            setIsOpen(false);
        } catch (error) {
            console.error("Error updating document: ", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update the loyalty discount." });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Edit</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Loyalty Discount</DialogTitle>
                    <DialogDescription>Update the details for this discount tier.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pointsRequired" className="text-right">Points Required</Label>
                            <Input id="pointsRequired" type="number" value={pointsRequired} onChange={e => setPointsRequired(Number(e.target.value))} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="discountPercentage" className="text-right">Discount (%)</Label>
                            <Input id="discountPercentage" type="number" value={discountPercentage} onChange={e => setDiscountPercentage(Number(e.target.value))} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="isActive" className="text-right">Active</Label>
                            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
