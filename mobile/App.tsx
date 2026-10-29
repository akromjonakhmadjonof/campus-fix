import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Appearance,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";
import { parseWebMessage, platformScript } from "./src/bridge";
import { StatusBar } from "expo-status-bar";
import { NavigationBar } from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import { bootstrapAppearance, type NativeAppearance } from "./src/appearance";
let rootUpdate = Promise.resolve();
function updateNativeRoot(background: string) {
  rootUpdate = rootUpdate
    .catch(() => undefined)
    .then(() => SystemUI.setBackgroundColorAsync(background));
  void rootUpdate.catch(() => console.warn("Could not synchronize the native root background."));
}
updateNativeRoot(
  bootstrapAppearance(Appearance.getColorScheme() === "dark" ? "dark" : "light").colors.background,
);
const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? (__DEV__ ? "http://localhost:3000" : "");
function Host({
  appearance,
  onAppearance,
}: {
  appearance: NativeAppearance;
  onAppearance: (value: NativeAppearance) => void;
}) {
  const colors = appearance.colors;
  const webview = useRef<WebView<WebViewProps>>(null);
  const canGoBack = useRef(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadKey, setLoadKey] = useState(0);
  const [locale, setLocale] = useState<"en" | "es" | "ar" | "ru" | "uz">("en");
  const copy = {
    en: {
      title: "We couldn’t load this. Please try again.",
      message: "Try again",
      retry: "Try again",
      loading: "Loading…",
    },
    es: {
      title: "No pudimos cargar la información. Inténtalo de nuevo.",
      message: "Reintentar",
      retry: "Reintentar",
      loading: "Cargando…",
    },
    ar: {
      title: "تعذّر التحميل. يُرجى المحاولة مجددًا.",
      message: "إعادة المحاولة",
      retry: "إعادة المحاولة",
      loading: "جارٍ التحميل…",
    },
    ru: {
      title: "Не удалось загрузить. Попробуйте ещё раз.",
      message: "Повторить",
      retry: "Повторить",
      loading: "Загрузка…",
    },
    uz: {
      title: "Yuklab boʻlmadi. Qayta urinib koʻring.",
      message: "Qayta urinish",
      retry: "Qayta urinish",
      loading: "Yuklanmoqda…",
    },
  }[locale];
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const origin = new URL(webUrl).origin;
  const sendVisibility = useCallback(
    (active: boolean) =>
      webview.current?.injectJavaScript(
        `window.dispatchEvent(new CustomEvent('campus-visibility', {detail:{active:${active}}})); true;`,
      ),
    [],
  );
  const sendPlatform = () => {
    webview.current?.injectJavaScript(platformScript(platform));
    sendVisibility(AppState.currentState === "active");
  };
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      sendVisibility(state === "active");
      if (state === "active") webview.current?.injectJavaScript(platformScript(platform));
    });
    return () => subscription.remove();
  }, [sendVisibility, platform]);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current && !failed) {
        webview.current?.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [failed]);
  const receive = (event: WebViewMessageEvent) => {
    try {
      if (new URL(event.nativeEvent.url).origin !== origin) return;
    } catch {
      return;
    }
    const message = parseWebMessage(event.nativeEvent.data);
    if (message?.type === "web.ready") sendPlatform();
    else if (message?.type === "web.appearance") onAppearance(message.payload);
  };
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom", "left", "right"]}
    >
      {failed ? (
        <View
          style={[styles.center, { backgroundColor: colors.background }]}
          accessibilityRole="alert"
        >
          <Text style={[styles.title, { color: colors.foreground }]}>{copy.title}</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{copy.message}</Text>
          <Pressable
            accessibilityRole="button"
            style={[styles.retry, { backgroundColor: colors.primary }]}
            onPress={() => {
              canGoBack.current = false;
              setFailed(false);
              setLoading(true);
              setLoadKey((value) => value + 1);
            }}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
              {copy.retry}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <WebView<WebViewProps>
            key={loadKey}
            ref={webview}
            source={{ uri: webUrl }}
            style={[styles.webview, { backgroundColor: colors.background }]}
            containerStyle={{ backgroundColor: colors.background }}
            injectedJavaScriptBeforeContentLoaded="if(document.documentElement) document.documentElement.dataset.native = 'true'; true;"
            forceDarkOn={false}
            automaticallyAdjustContentInsets={false}
            originWhitelist={[origin]}
            onShouldStartLoadWithRequest={(request) => {
              if (request.url === "about:blank") return true;
              try {
                const target = new URL(request.url);
                if (target.origin === origin) return true;
                if (target.protocol === "https:" || target.protocol === "http:")
                  void Linking.openURL(request.url).catch(() => {});
              } catch {
                return false;
              }
              return false;
            }}
            onNavigationStateChange={(state) => {
              canGoBack.current = state.canGoBack;
              try {
                const next = new URL(state.url).pathname.split("/")[1];
                if (
                  next === "en" ||
                  next === "es" ||
                  next === "ar" ||
                  next === "ru" ||
                  next === "uz"
                )
                  setLocale(next);
              } catch {
                // Ignore transient platform URLs while the WebView navigates.
              }
            }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              sendPlatform();
            }}
            onMessage={receive}
            onError={() => {
              setFailed(true);
              setLoading(false);
            }}
            onHttpError={(event) => {
              if (
                event.nativeEvent.url === webUrl ||
                event.nativeEvent.url.startsWith(origin + "/")
              ) {
                setFailed(true);
                setLoading(false);
              }
            }}
            onContentProcessDidTerminate={() => {
              setFailed(true);
              setLoading(false);
            }}
            onRenderProcessGone={() => {
              setFailed(true);
              setLoading(false);
            }}
            allowsBackForwardNavigationGestures
            contentInsetAdjustmentBehavior="never"
            setSupportMultipleWindows={false}
          />
          {loading && (
            <View
              style={[styles.loading, { backgroundColor: colors.background }]}
              accessibilityRole="progressbar"
              accessibilityLabel={copy.loading}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.foreground }}>{copy.loading}</Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}
export default function App() {
  const system = useColorScheme();
  const [webAppearance, setWebAppearance] = useState<NativeAppearance | null>(null);
  const appearance = webAppearance ?? bootstrapAppearance(system === "dark" ? "dark" : "light");
  const receiveAppearance = useCallback((next: NativeAppearance) => {
    setWebAppearance((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );
  }, []);
  useEffect(() => updateNativeRoot(appearance.colors.background), [appearance.colors.background]);
  return (
    <SafeAreaProvider
      initialMetrics={initialWindowMetrics}
      style={{ backgroundColor: appearance.colors.background }}
    >
      <StatusBar
        style={appearance.mode === "dark" ? "light" : "dark"}
        animated={false}
        hidden={false}
      />
      <NavigationBar style={appearance.mode === "dark" ? "light" : "dark"} hidden={false} />
      {/^https?:\/\//.test(webUrl) ? (
        <Host appearance={appearance} onAppearance={receiveAppearance} />
      ) : (
        <SafeAreaView style={[styles.center, { backgroundColor: appearance.colors.background }]}>
          <Text style={{ color: appearance.colors.foreground }}>
            Set EXPO_PUBLIC_WEB_URL to your CampusFix server URL.
          </Text>
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: "600" },
  message: { textAlign: "center" },
  retry: {
    minHeight: 48,
    minWidth: 96,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  retryText: { fontWeight: "600" },
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
});
