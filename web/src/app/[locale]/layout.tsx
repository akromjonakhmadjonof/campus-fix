import { appearanceBootstrap } from "@/lib/appearance";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AppProviders } from "@/providers/app-providers";
import { AppShell } from "@/components/campus/app-shell";
import "@/styles/globals.css";
import "@/styles/nprogress.css";
import "@/styles/campus.css";
const nunito = localFont({
  src: "../../styles/fonts/nunito-variable.ttf",
  variable: "--font-nunito",
  display: "swap",
  weight: "200 1000",
});
const arabic = localFont({
  src: "../../styles/fonts/noto-sans-arabic.ttf",
  variable: "--font-arabic",
  display: "swap",
  weight: "100 900",
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : "en",
    namespace: "app",
  });
  return { title: "CampusFix", description: t("tagline") };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
      </head>
      <body className={`${nunito.variable} ${arabic.variable} min-h-dvh font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/New_York">
          <AppProviders>
            <AppShell>{children}</AppShell>
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
