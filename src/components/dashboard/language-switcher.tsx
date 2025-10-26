
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const changeLanguage = (locale: string) => {
    startTransition(() => {
      // The pathname includes the current locale, so we need to remove it
      // before prepending the new one.
      const newPath = pathname.startsWith('/si') || pathname.startsWith('/en')
        ? pathname.substring(3)
        : pathname;
      router.replace(`/${locale}${newPath || '/'}`);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('si')}>
          Sinhala
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
