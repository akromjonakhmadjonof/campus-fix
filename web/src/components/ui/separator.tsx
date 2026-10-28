"use client";

// Imports
import { Separator as SeparatorPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

// Components
function Separator(props: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  // Props
  const { className, orientation = "horizontal", decorative = true, ...restProps } = props;

  // Render
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...restProps}
    />
  );
}

// Exports
export { Separator };
