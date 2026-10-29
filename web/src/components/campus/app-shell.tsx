"use client";
import { Suspense, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { UserRound, ClipboardList, CirclePlus, ChartNoAxesCombined, Settings2 } from "lucide-react";
import { NavigationLink as Link } from "@/components/navigation-link";
import { usePathname } from "@/i18n/navigation";
import { useUnreadNotifications } from "./notifications";
import { campus } from "@/lib/campus-api";
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("app");
  const path = usePathname();
  const session = useQuery({ queryKey: ["campus", "staff"], queryFn: campus.staff });
  const isStaff = path.startsWith("/staff") || !!session.data?.staff;
  const unread = useUnreadNotifications(!isStaff && !session.isPending);
  const login = path === "/staff/login";
  const navigationVisible = !login && (!path.startsWith("/staff") || !!session.data?.staff);
  if (login)
    return (
      <main id="main-content" className="auth-shell">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    );
  const tabs = [
    {
      href: isStaff ? "/staff" : "/",
      key: "account",
      Icon: UserRound,
      active:
        path === "/" ||
        path === "/me" ||
        path === "/notifications" ||
        path === "/staff" ||
        path === "/staff/resolved" ||
        path === "/staff/login",
    },
    {
      href: isStaff ? "/staff/requests" : "/reports",
      key: isStaff ? "staffRequests" : "exploreTitle",
      Icon: ClipboardList,
      active:
        (path.startsWith("/reports") && path !== "/reports/new") ||
        path.startsWith("/issues") ||
        path.startsWith("/staff/requests"),
    },
    {
      href: isStaff ? "/staff/dashboard" : "/reports/new",
      key: isStaff ? "dashboard" : "report",
      Icon: isStaff ? ChartNoAxesCombined : CirclePlus,
      active: isStaff ? path === "/staff/dashboard" : path === "/reports/new" || path === "/report",
    },
    {
      href: isStaff ? "/staff/settings" : "/settings",
      key: "settings",
      Icon: Settings2,
      active: path.endsWith("/settings"),
    },
  ] as const;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("skipContent")}
      </a>
      <div className="app-body">
        <main id="main-content" className="page-container">
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                {t("loading")}
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
      {navigationVisible && (
        <nav className="mobile-tabs" aria-label="CampusFix">
          {tabs.map(({ href, key, Icon, active }) => (
            <Link
              key={key}
              href={href}
              className={active ? "active" : ""}
              aria-label={t(key)}
              aria-current={active ? "page" : undefined}
              title={t(key)}
              aria-describedby={
                key === "account" && !isStaff && unread.data?.count
                  ? "account-unread-count"
                  : undefined
              }
            >
              <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
              {key === "account" && !isStaff && !!unread.data?.count && (
                <span
                  className="nav-unread-badge"
                  id="account-unread-count"
                  aria-label={t("unreadNotifications", { count: unread.data.count })}
                >
                  {unread.data.count > 99 ? "99+" : unread.data.count}
                </span>
              )}
              <span className="nav-tooltip" aria-hidden="true">
                {t(key)}
              </span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
