export function assertTestDatabase(
  environment: string | undefined,
  connection: string | undefined,
): string {
  if (environment !== "test" || !connection)
    throw new Error("Explicit NODE_ENV=test and DATABASE_URL required");
  const url = new URL(connection);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== "/campus_fix_test")
    throw new Error("Refusing database access: expected campus_fix_test");
  return connection;
}
