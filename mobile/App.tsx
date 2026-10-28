import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";
import { parseWebMessage, platformScript } from "./src/bridge";
const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? (__DEV__ ? "http://localhost:3000" : "");
function Host() {
  const webview = useRef<WebView<WebViewProps>>(null);
  const canGoBack = useRef(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadKey, setLoadKey] = useState(0);
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const origin = new URL(webUrl).origin;
  const sendPlatform = () => webview.current?.injectJavaScript(platformScript(platform));
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
    if (parseWebMessage(event.nativeEvent.data)) sendPlatform();
  };
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      {failed ? (
        <View style={styles.center} accessibilityRole="alert">
          <Text style={styles.title}>Unable to connect</Text>
          <Text style={styles.message}>
            Check that the web server is running and this device can reach {webUrl}.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.retry}
            onPress={() => {
              canGoBack.current = false;
              setFailed(false);
              setLoading(true);
              setLoadKey((value) => value + 1);
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <WebView<WebViewProps>
            key={loadKey}
            ref={webview}
            source={{ uri: webUrl }}
            style={styles.webview}
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
              style={styles.loading}
              accessibilityRole="progressbar"
              accessibilityLabel="Loading CampusFix"
            >
              <ActivityIndicator size="large" />
              <Text>Loading CampusFix…</Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Host />
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: "600" },
  message: { textAlign: "center", color: "#444" },
  retry: {
    minHeight: 48,
    minWidth: 96,
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  retryText: { color: "#fff", fontWeight: "600" },
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
    gap: 12,
  },
});
