"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Wrench, ShieldCheck, LoaderCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { campus } from "@/lib/campus-api";
import { ApiError } from "@/lib/api/client";
import { safeStaffDestination } from "@/lib/staff-navigation";
import { useRouter } from "@/hooks/use-router";
import { clearStaffData, useStaffSession } from "./staff-session";
import { BrandShield, ErrorState } from "./shared";
export function StaffLogin() {
  const t = useTranslations("app"),
    current = useStaffSession(),
    client = useQueryClient(),
    router = useRouter(),
    params = useSearchParams();
  const [visible, setVisible] = useState(false),
    redirected = useRef("");
  const destination = safeStaffDestination(params.get("next"));
  const submitting = useRef(false);
  const schema = z.object({
    username: z
      .string()
      .trim()
      .min(1, t("required"))
      .email(t("emailInvalid"))
      .max(254, t("emailInvalid")),
    password: z.string().min(1, t("required")).max(128, t("loginFailed")),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });
  useEffect(() => {
    if (current.data?.staff && redirected.current !== destination) {
      redirected.current = destination;
      router.replace(destination);
    }
  }, [current.data, destination, router]);
  const login = useMutation({
    // Keep credentials out of TanStack Query's retained mutation variables.
    mutationFn: () => {
      const { username, password } = form.getValues();
      return campus.login({ username: username.trim(), password });
    },
    gcTime: 0,
    onSettled: () => {
      submitting.current = false;
    },
    onSuccess: async () => {
      form.reset();
      setVisible(false);
      await clearStaffData(client);
      await client.invalidateQueries({ queryKey: ["campus", "staff"] });
    },
  });
  return (
    <div className="staff-auth">
      <aside className="staff-auth-brand">
        <div className="auth-brand-mark">
          <BrandShield />
          <span>CampusFix</span>
        </div>
        <div className="staff-auth-story">
          <span className="auth-service-icon">
            <Wrench size={28} strokeWidth={1.5} />
          </span>
          <h2>{t("staffBrandHeadline")}</h2>
          <p>{t("staffBrandDescription")}</p>
        </div>
        <p className="auth-trust">
          <ShieldCheck size={17} />
          {t("staffAuthorized")}
        </p>
      </aside>
      <section className="staff-auth-content">
        <div className="staff-auth-form">
          <div className="auth-brand-mark auth-mobile-brand">
            <BrandShield />
            <span>CampusFix</span>
          </div>
          <p className="auth-eyebrow">{t("staffEyebrow")}</p>
          <h1>{t("staffLoginWelcome")}</h1>
          <p className="auth-description">{t("staffLoginDescription")}</p>
          {current.isError ? (
            <ErrorState retry={current.refetch} />
          ) : current.isPending || current.data?.staff ? (
            <p className="auth-pending" role="status">
              <LoaderCircle size={18} />
              {t("checkingAccess")}
            </p>
          ) : (
            <form
              noValidate
              onSubmit={(event) => {
                void form.handleSubmit(() => {
                  if (!submitting.current) {
                    submitting.current = true;
                    login.mutate();
                  }
                })(event);
              }}
              aria-busy={login.isPending}
            >
              <div className="field">
                <label htmlFor="staff-username">{t("emailAddress")}</label>
                <Input
                  id="staff-username"
                  type="email"
                  dir="ltr"
                  fieldSize="lg"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="email"
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.username}
                  aria-describedby="staff-email-error"
                  disabled={login.isPending}
                  {...form.register("username")}
                />
                <span className="field-error" id="staff-email-error">
                  {form.formState.errors.username?.message}
                </span>
              </div>
              <div className="field">
                <label htmlFor="staff-password">{t("password")}</label>
                <div className="password-field">
                  <Input
                    id="staff-password"
                    type={visible ? "text" : "password"}
                    dir="ltr"
                    fieldSize="lg"
                    autoComplete="current-password"
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.password}
                    aria-describedby="staff-password-error"
                    disabled={login.isPending}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={t(visible ? "hidePassword" : "showPassword")}
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                    disabled={login.isPending}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span id="staff-password-error" className="field-error">
                  {form.formState.errors.password?.message}
                </span>
              </div>
              {login.isError && (
                <p className="auth-error" role="alert">
                  {t(
                    login.error instanceof ApiError && login.error.status === 429
                      ? "rateLimited"
                      : "loginFailed",
                  )}
                </p>
              )}
              <button className="button primary full auth-submit" disabled={login.isPending}>
                {login.isPending && <LoaderCircle size={17} />}
                <span>{t(login.isPending ? "signingIn" : "signIn")}</span>
              </button>
            </form>
          )}
          <p className="auth-mobile-trust">
            <ShieldCheck size={15} />
            {t("staffAuthorized")}
          </p>
        </div>
      </section>
    </div>
  );
}
