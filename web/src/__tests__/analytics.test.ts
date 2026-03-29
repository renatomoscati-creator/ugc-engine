import { describe, it, expect, vi } from "vitest";

// Mock the db module
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ all: vi.fn(() => []), get: vi.fn(() => null) })),
        orderBy: vi.fn(() => ({ limit: vi.fn(() => ({ all: vi.fn(() => []) })) })),
        leftJoin: vi.fn(() => ({ where: vi.fn(() => ({ all: vi.fn(() => []) })) })),
        all: vi.fn(() => []),
      })),
    })),
  })),
}));

// These tests verify function signatures exist and return correct shape
describe("analytics helpers", () => {
  it("getTopLineMetrics returns required fields", async () => {
    const { getTopLineMetrics } = await import("@/lib/analytics");
    const result = await getTopLineMetrics(1);
    expect(result).toHaveProperty("totalPosts");
    expect(result).toHaveProperty("totalViews");
    expect(result).toHaveProperty("weeklyPostCount");
    expect(result).toHaveProperty("followerGrowth");
  });

  it("getPillarBreakdown returns an array", async () => {
    const { getPillarBreakdown } = await import("@/lib/analytics");
    const result = await getPillarBreakdown(1);
    expect(Array.isArray(result)).toBe(true);
  });

  it("getHookPerformance returns an array", async () => {
    const { getHookPerformance } = await import("@/lib/analytics");
    const result = await getHookPerformance(1);
    expect(Array.isArray(result)).toBe(true);
  });

  it("getPipelineHealth returns required fields", async () => {
    const { getPipelineHealth } = await import("@/lib/analytics");
    const result = await getPipelineHealth(1);
    expect(result).toHaveProperty("queuedCount");
    expect(result).toHaveProperty("failedCount");
    expect(result).toHaveProperty("avgJobDurationMs");
  });
});
