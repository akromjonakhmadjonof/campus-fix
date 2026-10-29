import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnvironment } from "../src/config/environment.js";

const base = { DATABASE_URL: "postgresql://app:secret@localhost/campus_fix_test" };
test("explicit numeric and boolean parsing with safe defaults", () => {
  const result = parseEnvironment({ ...base, PORT: "4100", DB_SSL: "false" });
  assert.equal(result.PORT, 4100);
  assert.equal(result.DB_SSL, false);
  for (const PORT of ["", "0", "1e3", "12.5", "70000"])
    assert.throws(() => parseEnvironment({ ...base, PORT }));
  assert.throws(() => parseEnvironment({ ...base, DB_SSL: "yes" }));
  assert.throws(() => parseEnvironment({ ...base, DB_POOL_MAX: "0" }));
});
test("configuration failures never reflect credentials", () => {
  assert.throws(
    () => parseEnvironment({ DATABASE_URL: "secret-password" }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /DATABASE_URL/);
      assert.doesNotMatch(error.message, /secret-password/);
      return true;
    },
  );
});
test("production requires verified TLS, HTTPS origins and no public docs", () => {
  assert.throws(() => parseEnvironment({ ...base, NODE_ENV: "production" }));
  const production = {
    ...base,
    NODE_ENV: "production",
    DB_SSL: "true",
    OIDC_ISSUER: "https://id.example.com/",
    OIDC_AUDIENCE: "campus-api",
    OIDC_JWKS_URI: "https://id.example.com/jwks",
    CORS_ORIGINS: "https://campus.example.com",
  };
  assert.equal(parseEnvironment(production).DB_SSL, true);
  assert.doesNotThrow(() =>
    parseEnvironment({
      ...production,
      OIDC_ISSUER: undefined,
      OIDC_AUDIENCE: undefined,
      OIDC_JWKS_URI: undefined,
    }),
  );
  assert.throws(() => parseEnvironment({ ...production, SWAGGER_ENABLED: "true" }));
  assert.throws(() =>
    parseEnvironment({ ...production, DATABASE_URL: base.DATABASE_URL + "?sslmode=no-verify" }),
  );
  assert.throws(() =>
    parseEnvironment({ ...production, OIDC_JWKS_URI: "http://id.example.com/jwks" }),
  );
});
test("partial OIDC config, wildcard origins and blanket proxy trust are rejected", () => {
  assert.throws(() => parseEnvironment({ ...base, OIDC_ISSUER: "https://id.example.com" }));
  assert.throws(() => parseEnvironment({ ...base, CORS_ORIGINS: "*" }));
  assert.throws(() => parseEnvironment({ ...base, TRUST_PROXY: "true" }));
  assert.throws(() => parseEnvironment({ ...base, TRUST_PROXY: "999.1.1.1/88" }));
});
