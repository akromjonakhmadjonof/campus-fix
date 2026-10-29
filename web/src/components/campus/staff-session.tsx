"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { campus } from "@/lib/campus-api";
import { usePathname } from "@/i18n/navigation";
import { useRouter } from "@/hooks/use-router";
import { BrandShield, ErrorState, useFeedback } from "./shared";
export function useStaffSession() {
  return useQuery({
    queryKey: ["campus", "staff"],
    queryFn: campus.staff,
    retry: false,
    refetchOnWindowFocus: true,
  });
}
export function StaffAccess({ children }: { children: ReactNode }) {
  const session = useStaffSession(),
    pathname = usePathname(),
    params = useSearchParams(),
    router = useRouter();
  const t = useTranslations("app");
  const redirected = useRef("");
  const login = pathname === "/staff/login";
  const next = pathname + (params.size ? "?" + params.toString() : "");
  useEffect(() => {
    if (session.data?.staff) {
      redirected.current = "";
      return;
    }
    if (
      !login &&
      !session.isPending &&
      !session.isError &&
      !session.data?.staff &&
      redirected.current !== next
    ) {
      redirected.current = next;
      router.replace("/staff/login?next=" + encodeURIComponent(next));
    }
  }, [login, session.isPending, session.isError, session.data, next, router]);
  if (login) return children;
  if (session.isError) return <ErrorState retry={session.refetch} />;
  if (!session.data?.staff)
    return (
      <div className="staff-session-loading" role="status">
        <BrandShield />
        <p>{t("checkingAccess")}</p>
      </div>
    );
  return children;
}
const protectedQuery = (query: Query) =>
  query.queryKey[0] === "campus" &&
  (["staff-overview", "staff-reports", "staff-resolved", "staff-analytics"].includes(
    String(query.queryKey[1]),
  ) ||
    (query.queryKey[1] === "report" && query.queryKey[3] === true));
export async function clearStaffData(client: QueryClient) {
  await client.cancelQueries({ predicate: protectedQuery });
  client.removeQueries({ predicate: protectedQuery });
}
export function StaffSignOut() {
  const client = useQueryClient(),
    router = useRouter(),
    t = useTranslations("app"),
    feedback = useFeedback();
  const logout = useMutation({
    mutationFn: campus.logout,
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: ["campus", "staff"] });
      await clearStaffData(client);
      client.setQueryData(["campus", "staff"], { staff: null });
      router.replace("/staff/login");
    },
    onError: feedback,
  });
  return (
    <button
      className="settings-row staff-sign-out"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
    >
      <LogOut size={19} />
      <span>{t(logout.isPending ? "signingOut" : "signOut")}</span>
    </button>
  );
}
