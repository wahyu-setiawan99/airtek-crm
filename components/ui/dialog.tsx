"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-0 z-50 overflow-y-auto bg-popover p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-popover-foreground sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,820px)] sm:w-[min(100%-1.5rem,32rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:pb-5 sm:pt-5 sm:shadow-xl",
            wide && "sm:w-[min(100%-1.5rem,42rem)]",
          )}
        >
          <DialogPrimitive.Title className="pr-8 text-lg font-semibold tracking-tight">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className={description ? "mt-1 text-sm text-muted-foreground" : "sr-only"}>
            {description ?? title}
          </DialogPrimitive.Description>
          <div className="mt-4">{children}</div>
          <DialogPrimitive.Close className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-md text-muted-foreground hover:bg-accent sm:top-3 sm:h-8 sm:w-8" aria-label="Close">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
