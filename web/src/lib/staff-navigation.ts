export function safeStaffDestination(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\r\n\\#]/.test(value))
    return "/staff";
  const [path] = value.split("?");
  return [
    "/staff",
    "/staff/requests",
    "/staff/resolved",
    "/staff/settings",
    "/staff/dashboard",
  ].includes(path) ||
    /^\/staff\/requests\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(path)
    ? value
    : "/staff";
}
