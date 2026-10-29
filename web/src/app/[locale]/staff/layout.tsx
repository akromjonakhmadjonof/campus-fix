import type { ReactNode } from "react";
import { StaffAccess } from "@/components/campus/staff-session";
export default function StaffLayout({ children }: { children: ReactNode }) {
  return <StaffAccess>{children}</StaffAccess>;
}
