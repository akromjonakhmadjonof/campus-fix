"use client";
import { useRef, type ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { startNavigation } from "@/lib/navigation-progress";
export function NavigationLink({ onNavigate, ref, ...props }: ComponentProps<typeof Link>) {
  const anchor = useRef<HTMLAnchorElement | null>(null);
  return (
    <Link
      {...props}
      ref={(node) => {
        anchor.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      }}
      onNavigate={(event) => {
        let canceled = false;
        onNavigate?.({
          preventDefault() {
            canceled = true;
            event.preventDefault();
          },
        });
        // Next invokes this only for eligible client navigations; href includes the resolved locale.
        if (!canceled && anchor.current) startNavigation(anchor.current.href);
      }}
    />
  );
}
