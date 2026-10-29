import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: mock }));
beforeEach(() => {
  vi.resetModules();
  mock.get.mockReset().mockResolvedValue({ data: { data: [] } });
  mock.post.mockReset().mockResolvedValue({ data: { active: true } });
  mock.patch.mockReset();
});
describe("CampusFix browser API contract", () => {
  it("shares initial ownership creation across concurrent requests", async () => {
    const { campus } = await import("./campus-api");
    await Promise.all([campus.reports(), campus.report("example")]);
    expect(mock.post).toHaveBeenCalledTimes(1);
    expect(mock.post).toHaveBeenCalledWith(
      "/anonymous/session",
      {},
      expect.objectContaining({ headers: { "X-CampusFix-Request": "1" }, withCredentials: true }),
    );
  });
  it("sends only similarity DTO fields even when passed a complete form", async () => {
    const { campus } = await import("./campus-api");
    const input = {
      title: "Fountain leak",
      description: "Water in the corridor",
      category: "PLUMBING" as const,
      locationId: "root",
      issueTypeId: "type",
      exactLocation: "stairs",
      attachmentId: "private-photo",
    };
    await campus.similar(input);
    expect(mock.post).toHaveBeenCalledWith(
      "/reports/similar",
      {
        title: input.title,
        description: input.description,
        issueTypeId: input.issueTypeId,
        exactLocation: input.exactLocation,
        locationId: input.locationId,
      },
      expect.any(Object),
    );
  });
  it("allows retry after ownership creation fails", async () => {
    const { ensureSession } = await import("./campus-api");
    mock.post.mockRejectedValueOnce(new Error("offline"));
    await expect(ensureSession()).rejects.toThrow("offline");
    await ensureSession();
    expect(mock.post).toHaveBeenCalledTimes(2);
  });
});
