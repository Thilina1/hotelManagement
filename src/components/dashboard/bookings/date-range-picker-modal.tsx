'use client';

import { useState, useEffect } from 'react';
import { DateRange, DayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface DateRangePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (range: DateRange | undefined) => void;
  initialDateRange?: DateRange;
  disabled?: (date: Date) => boolean;
}

export function DateRangePickerModal({
  isOpen,
  onClose,
  onSave,
  initialDateRange,
  disabled
}: DateRangePickerModalProps) {
  const [range, setRange] = useState<DateRange | undefined>(initialDateRange);

  useEffect(() => {
    if (isOpen) {
      setRange(initialDateRange);
    }
  }, [isOpen, initialDateRange]);

  const handleSave = () => {
    onSave(range);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-fit">
        <DialogHeader>
          <DialogTitle>Select Date Range</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
            <DayPicker
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                disabled={disabled}
            />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Dates</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
