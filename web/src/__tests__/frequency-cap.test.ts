import { describe, it, expect, vi, beforeEach } from "vitest";

// We'll set up mock DB state per test
let mockPostsCount = 0;
let mockDailyCap: number | null = 3;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          all: vi.fn(() => Array(mockPostsCount).fill({})),
          get: vi.fn(() =>
            mockDailyCap !== null
              ? { defaultFrequencyCap: mockDailyCap }
              : null
          ),
        })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            get: vi.fn(() =>
              mockDailyCap !== null
                ? { frequencyCap: null, defaultFrequencyCap: mockDailyCap }
                : null
            ),
          })),
        })),
      })),
    })),
  })),
}));

describe("checkFrequencyCap", () => {
  beforeEach(() => {
    vi.resetModules();
    mockPostsCount = 0;
    mockDailyCap = 3;
  });

  it("returns true when posts_today < daily_cap", async () => {
    mockPostsCount = 1;
    mockDailyCap = 3;
    const { checkFrequencyCap } = await import(
      "@/lib/scheduling/frequency-cap"
    );
    const result = await checkFrequencyCap(1, "tiktok", "2026-03-29");
    expect(result).toBe(true);
  });

  it("returns false when posts_today >= daily_cap", async () => {
    mockPostsCount = 3;
    mockDailyCap = 3;
    const { checkFrequencyCap } = await import(
      "@/lib/scheduling/frequency-cap"
    );
    const result = await checkFrequencyCap(1, "tiktok", "2026-03-29");
    expect(result).toBe(false);
  });

  it("handles missing platform config gracefully (returns true as safe default)", async () => {
    mockPostsCount = 0;
    mockDailyCap = null;
    const { checkFrequencyCap } = await import(
      "@/lib/scheduling/frequency-cap"
    );
    const result = await checkFrequencyCap(1, "unknown_platform", "2026-03-29");
    expect(result).toBe(true);
  });
});
