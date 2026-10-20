import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-subtle outline-none transition-[box-shadow] duration-150 focus:ring-2 focus:ring-primary/40",
        className,
      )}
      {...props}
    />
  );
}
