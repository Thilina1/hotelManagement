
'use client';

import { useState } from 'react';
import { DateRange, DayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { addDays, startOfToday } from 'date-fns';

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
  disabled,
}: DateRangePickerModalProps) {
  // This state now reliably controls the picker's selection
  const [range, setRange] = useState<DateRange | undefined>(initialDateRange);

  const handleSave = () => {
    onSave(range);
  };
  
  const today = startOfToday();

  // Presets for quick selection
  const presets = [
      { label: 'Today', range: { from: today, to: today } },
      { label: 'Next 7 Days', range: { from: today, to: addDays(today, 6) } },
      { label: 'Next 30 Days', range: { from: today, to: addDays(today, 29) } },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Check-in and Check-out Dates</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
            <div className="flex justify-center border-r pr-4">
                <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={2}
                    pagedNavigation
                    disabled={disabled}
                    initialFocus
                    modifiersClassNames={{
                      selected: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90',
                      day_range_start: 'day-range-start',
                      day_range_end: 'day-range-end',
                    }}
                />
            </div>
             <div className="flex flex-col space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Presets</h3>
                {presets.map(({ label, range }) => (
                    <Button key={label} variant="ghost" onClick={() => setRange(range)}>
                        {label}
                    </Button>
                ))}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!range?.from || !range?.to}>Save Dates</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
