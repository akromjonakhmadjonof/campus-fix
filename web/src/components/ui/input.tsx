"use client";

// Imports
import { cva as createVariants, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

// Constants
const inputVariants = createVariants(
  "w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-lg border border-input bg-transparent transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        unstyled:
          "border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
      },
      fieldSize: {
        default: "h-10 px-3.5 py-2 text-base file:h-8 file:text-sm md:text-sm",
        lg: "h-12 px-4 py-2.5 text-base file:h-9 file:text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      fieldSize: "default",
    },
  },
);

// Components
function Input(props: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  // Props
  const { className, type, variant, fieldSize, ...restProps } = props;

  // Render
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, fieldSize }), className)}
      {...restProps}
    />
  );
}

// Exports
export { Input, inputVariants };
