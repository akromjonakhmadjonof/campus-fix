import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          failureCount < 1 &&
          !(
            error instanceof ApiError &&
            error.status !== undefined &&
            error.status >= 400 &&
            error.status < 500
          ),
      },
      mutations: { retry: false },
    },
  });
}
let browserClient: QueryClient | undefined;
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  return (browserClient ??= makeQueryClient());
}
