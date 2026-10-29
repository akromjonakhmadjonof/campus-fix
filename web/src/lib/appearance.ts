import { webAppearanceSchema } from "./platform/protocol";

export type ThemePreference = "light" | "dark" | "system";
export const preferencesKey = "campusfix.preferences";
let fallbackPreferences = "system|false";
let storageOverride = false;
export function readPreferences() {
  if (storageOverride) return fallbackPreferences;
  try {
    return localStorage.getItem(preferencesKey) ?? "system|false";
  } catch {
    return fallbackPreferences;
  }
}
export function writePreferences(theme: ThemePreference, reduce: boolean) {
  fallbackPreferences = `${theme}|${reduce}`;
  try {
    localStorage.setItem(preferencesKey, fallbackPreferences);
    storageOverride = false;
  } catch {
    storageOverride = true;
    /* Keep this session usable without storage. */
  }
  window.dispatchEvent(new Event("campus-preferences"));
}

// Self-contained: serialized into the document head and executed before hydration.
export function initializeAppearance() {
  let stored = "system|false";
  try {
    stored = localStorage.getItem("campusfix.preferences") ?? stored;
  } catch {
    /* Use OS appearance. */
  }
  const [theme, reduce] = stored.split("|");
  const dark =
    theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.style.backgroundColor = dark
    ? "var(--background, rgb(11, 13, 18))"
    : "var(--background, rgb(251, 250, 247))";
  root.dataset.reduceMotion = String(reduce === "true");
  root.dataset.native = String(!!window.ReactNativeWebView);
  // This mutable tag is owned by the appearance layer, not React's metadata hoister.
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", dark ? "#0b0d12" : "#fbfaf7");
}
export const appearanceBootstrap = `(${initializeAppearance.toString()})();`;

export function applyAppearance() {
  if (typeof document === "undefined") return;
  const [theme, reduce] = readPreferences().split("|");
  const dark =
    theme === "dark" ||
    (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.reduceMotion = String(reduce === "true");
  // Production CSS may minify rgb() tokens to hex. Resolve through a color property
  // so the bridge always receives browser-normalized RGB values from the same tokens.
  const probe = document.createElement("span");
  probe.hidden = true;
  root.appendChild(probe);
  const color = (name: string) => {
    probe.style.color = `var(--${name})`;
    return getComputedStyle(probe).color;
  };
  const colors = {
    background: color("background"),
    foreground: color("foreground"),
    card: color("card"),
    mutedForeground: color("muted-foreground"),
    primary: color("primary"),
    primaryForeground: color("primary-foreground"),
  };
  probe.remove();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.background);
  const message = webAppearanceSchema.safeParse({
    version: 1,
    type: "web.appearance",
    payload: { mode: dark ? "dark" : "light", colors },
  });
  if (message.success && window.ReactNativeWebView)
    window.ReactNativeWebView.postMessage(JSON.stringify(message.data));
}
export function connectAppearance() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  // Read storage directly here; the SSR snapshot is intentionally not authoritative.
  applyAppearance();
  media.addEventListener("change", applyAppearance);
  window.addEventListener("storage", applyAppearance);
  window.addEventListener("campus-preferences", applyAppearance);
  return () => {
    media.removeEventListener("change", applyAppearance);
    window.removeEventListener("storage", applyAppearance);
    window.removeEventListener("campus-preferences", applyAppearance);
  };
}
