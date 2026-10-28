// Imports
import { clsx, type ClassValue } from "clsx";
import { twMerge as mergeClasses } from "tailwind-merge";

// Functions
function cn(...inputs: ClassValue[]) {
  // Return
  return mergeClasses(clsx(inputs));
}

// Exports
export { cn };
