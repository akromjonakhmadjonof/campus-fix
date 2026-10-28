import axios from "axios";
import { z } from "zod";
const errorBodySchema = z.object({ message: z.string().optional(), code: z.string().optional() });
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const body = errorBodySchema.safeParse(error.response?.data);
    return new ApiError(
      body.success ? (body.data.message ?? error.message) : error.message,
      error.response?.status,
      body.success ? (body.data.code ?? error.code) : error.code,
    );
  }
  return new ApiError(
    error instanceof Error ? error.message : "An unexpected request error occurred",
  );
}
const baseURL = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/backend";
if (baseURL !== "/backend") throw new Error("NEXT_PUBLIC_API_BASE_PATH must be /backend");
export const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
);
