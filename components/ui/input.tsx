import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-subtle outline-none transition-[box-shadow] duration-150 focus:ring-2 focus:ring-primary/40",
        className,
      )}
      {...props}
    />
  );
}
