import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { appearanceBootstrap } from "./appearance";
import { webMessageSchema } from "./platform/protocol";
import { parseWebMessage } from "../../../mobile/src/bridge";
import { bootstrapAppearance, nativePalettes } from "../../../mobile/src/appearance";
import { categoryColors } from "./chart-colors";

describe("appearance contract across web and native", () => {
  it.each(["light", "dark"] as const)(
    "uses the CSS semantic tokens for the %s native bootstrap",
    (mode) => {
      const css = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8");
      const block = css.split(mode === "light" ? ":root {" : ".dark {")[1].split("}")[0];
      for (const [key, color] of Object.entries(nativePalettes[mode])) {
        const token = key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
        expect(block).toContain(`--${token}: ${color};`);
      }
      const message = { version: 1, type: "web.appearance", payload: bootstrapAppearance(mode) };
      expect(webMessageSchema.parse(message)).toEqual(message);
      expect(parseWebMessage(JSON.stringify(message))).toEqual(message);
    },
  );
  it.each([
    { ...bootstrapAppearance("light"), mode: "system" },
    {
      ...bootstrapAppearance("dark"),
      colors: { ...nativePalettes.dark, background: "rgb(999, 0, 0)" },
    },
    {
      ...bootstrapAppearance("dark"),
      colors: { ...nativePalettes.dark, background: "url(https://invalid.example)" },
    },
    { ...bootstrapAppearance("light"), session: "not-allowed" },
  ])("rejects invalid or unbounded native appearance messages", (payload) => {
    const message = { version: 1, type: "web.appearance", payload };
    expect(webMessageSchema.safeParse(message).success).toBe(false);
    expect(parseWebMessage(JSON.stringify(message))).toBeUndefined();
  });
  it.each([
    ["dark|true", false, false, "dark"],
    ["light|false", true, false, "light"],
    ["system|false", true, false, "dark"],
    ["invalid|false", true, false, "dark"],
    ["", true, true, "dark"],
  ])(
    "runs before hydration with preference %s and OS dark=%s",
    (stored, systemDark, blocked, expected) => {
      const classes = new Set<string>();
      const root = {
        classList: {
          toggle: (name: string, enabled: boolean) =>
            enabled ? classes.add(name) : classes.delete(name),
        },
        style: {} as Record<string, string>,
        dataset: {} as Record<string, string>,
      };
      let meta = "";
      runInNewContext(appearanceBootstrap, {
        localStorage: {
          getItem: () => {
            if (blocked) throw new Error("Storage blocked");
            return stored;
          },
        },
        matchMedia: () => ({ matches: systemDark }),
        window: { ReactNativeWebView: {} },
        document: {
          documentElement: root,
          querySelector: () => ({
            setAttribute: (_: string, value: string) => {
              meta = value;
            },
          }),
        },
      });
      expect(classes).toEqual(new Set([expected]));
      expect(root.style.colorScheme).toBe(expected);
      expect(root.dataset.native).toBe("true");
      expect(meta).toBe(expected === "dark" ? "#0b0d12" : "#fbfaf7");
    },
  );
  it("keeps six categories distinct and stable when counts reorder the cohort", () => {
    const ids = ["woodland", "sutherland", "pond", "library", "parking", "lares"];
    const first = categoryColors(ids);
    expect(new Set(Object.values(first)).size).toBe(6);
    expect(categoryColors(ids.toReversed())).toEqual(first);
    expect(categoryColors([...ids, "pond"])).toEqual(first);
  });
});
