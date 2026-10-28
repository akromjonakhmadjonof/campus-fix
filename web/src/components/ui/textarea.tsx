"use client";

// Imports
import { cva as createVariants, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

// Constants
const textareaVariants = createVariants(
  "flex field-sizing-content w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-lg border border-input bg-transparent transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        unstyled:
          "resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
      },
      fieldSize: {
        default: "min-h-24 px-3.5 py-2.5 text-base md:text-sm",
        compact: "min-h-10 p-0 text-sm",
        lg: "min-h-28 px-4 py-3 text-base",
        prompt: "min-h-16 px-4 py-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      fieldSize: "default",
    },
  },
);

// Components
function Textarea(props: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  // Props
  const { className, variant, fieldSize, ...restProps } = props;

  // Render
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant, fieldSize }), className)}
      {...restProps}
    />
  );
}

// Exports
export { Textarea, textareaVariants };
