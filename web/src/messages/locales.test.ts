import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";
import ar from "./ar.json";
import ru from "./ru.json";
import uz from "./uz.json";
function flatten(input: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[prefix + key, value]]
        : Object.entries(flatten(value as Record<string, unknown>, prefix + key + ".")),
    ),
  );
}
describe("locale contracts", () => {
  const source = flatten(en);
  for (const [locale, messages] of Object.entries({ es, ar, ru, uz }))
    it(`${locale} covers every message, taxonomy item, and interpolation`, () => {
      const translated = flatten(messages);
      expect(Object.keys(translated).sort()).toEqual(Object.keys(source).sort());
      for (const [key, value] of Object.entries(source)) {
        expect(translated[key], key).toBeTruthy();
        expect(translated[key], key).not.toContain("\uFFFD");
        expect([...translated[key].matchAll(/\{(\w+)/g)].map((m) => m[1]).sort(), key).toEqual(
          [...value.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort(),
        );
      }
    });
});
