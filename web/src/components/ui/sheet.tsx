"use client";

// Imports
import { Dialog as SheetPrimitive } from "radix-ui";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XIcon as CloseIcon } from "lucide-react";

// Types
type SheetContentOptionsType = {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
};

type SheetContentPropsType = React.ComponentProps<typeof SheetPrimitive.Content> &
  SheetContentOptionsType;

// Components
function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  // Props
  const { ...restProps } = props;

  // Render
  return <SheetPrimitive.Root data-slot="sheet" {...restProps} />;
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  // Props
  const { ...restProps } = props;

  // Render
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...restProps} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  // Props
  const { ...restProps } = props;

  // Render
  return <SheetPrimitive.Close data-slot="sheet-close" {...restProps} />;
}

function SheetPortal(props: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  // Props
  const { ...restProps } = props;

  // Render
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...restProps} />;
}

function SheetOverlay(props: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  // Props
  const { className, ...restProps } = props;

  // Render
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...restProps}
    />
  );
}

function SheetContent(props: SheetContentPropsType) {
  // Props
  const { className, children, side = "right", showCloseButton = true, ...restProps } = props;

  // Render
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10",
          className,
        )}
        {...restProps}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" className="absolute top-3 right-3" size="icon-sm">
              <CloseIcon />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader(props: React.ComponentProps<"div">) {
  // Props
  const { className, ...restProps } = props;

  // Render
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...restProps}
    />
  );
}

function SheetFooter(props: React.ComponentProps<"div">) {
  // Props
  const { className, ...restProps } = props;

  // Render
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...restProps}
    />
  );
}

function SheetTitle(props: React.ComponentProps<typeof SheetPrimitive.Title>) {
  // Props
  const { className, ...restProps } = props;

  // Render
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...restProps}
    />
  );
}

function SheetDescription(props: React.ComponentProps<typeof SheetPrimitive.Description>) {
  // Props
  const { className, ...restProps } = props;

  // Render
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...restProps}
    />
  );
}

// Exports
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
