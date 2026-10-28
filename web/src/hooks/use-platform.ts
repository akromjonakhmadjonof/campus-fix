"use client";
import { useSyncExternalStore } from "react";
import {
  getPlatformSnapshot,
  getServerPlatformSnapshot,
  subscribePlatform,
} from "@/lib/platform/runtime";
export function usePlatform() {
  return useSyncExternalStore(subscribePlatform, getPlatformSnapshot, getServerPlatformSnapshot);
}
