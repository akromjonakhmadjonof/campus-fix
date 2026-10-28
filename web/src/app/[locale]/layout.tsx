import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AppProviders } from "@/providers/app-providers";
import "@/styles/globals.css";
import "@/styles/nprogress.css";
const nunito = localFont({
  src: "../../styles/fonts/nunito-variable.ttf",
  variable: "--font-nunito",
  display: "swap",
  weight: "200 1000",
});
export const metadata: Metadata = {
  title: "CampusFix",
  description: "CampusFix application foundation",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
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
    <html lang={locale}>
      <body className={`${nunito.variable} min-h-dvh font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
