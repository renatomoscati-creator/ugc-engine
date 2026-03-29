import { describe, it, expect, vi, beforeEach } from "vitest";

// Slots stored as ISO strings; DB mock filters by date prefix
let mockAllSlots: string[] = [];
let mockFrequencyCapResult = true;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn((condition) => ({
          all: vi.fn(() => {
            // Return slots filtered to only those that match the date prefix
            // The condition contains a LIKE pattern — we simulate it by filtering
            // slots whose ISO string starts with any prefix found in mockAllSlots
            return mockAllSlots.map((s) => ({ scheduledAt: s }));
          }),
          get: vi.fn(() => null),
        })),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn(() => ({
            get: vi.fn(() => ({
              frequencyCap: null,
              defaultFrequencyCap: 3,
            })),
          })),
        }),
      }),
    }),
  })),
}));

vi.mock("@/lib/scheduling/frequency-cap", () => ({
  checkFrequencyCap: vi.fn(async () => mockFrequencyCapResult),
}));

// Helper: build an ISO string for a given UTC date+hour
function utcSlot(dateStr: string, utcHour: number): string {
  return `${dateStr}T${String(utcHour).padStart(2, "0")}:00:00.000Z`;
}

describe("getNextSlot", () => {
  beforeEach(() => {
    vi.resetModules();
    mockAllSlots = [];
    mockFrequencyCapResult = true;
    // 6am UTC — before 9am UTC slot
    vi.setSystemTime(new Date("2026-03-29T06:00:00.000Z"));
  });

  it("returns 9am slot if no existing posts that day", async () => {
    mockAllSlots = [];
    const { getNextSlot } = await import("@/lib/scheduling/next-slot");
    const result = await getNextSlot(1, "tiktok", new Date("2026-03-29T06:00:00.000Z"));
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("returns 6pm slot if 9am already taken", async () => {
    mockAllSlots = [utcSlot("2026-03-29", 9)];
    const { getNextSlot } = await import("@/lib/scheduling/next-slot");
    const result = await getNextSlot(1, "tiktok", new Date("2026-03-29T06:00:00.000Z"));
    expect(result.getUTCHours()).toBe(18);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("returns next day 9am if both slots taken", async () => {
    // Slots only on 2026-03-29; next day is clear
    // We need the mock to return different results per query (day 1 vs day 2).
    // Use a counter: first call returns both taken, subsequent calls return empty.
    let callCount = 0;
    mockAllSlots = [utcSlot("2026-03-29", 9), utcSlot("2026-03-29", 18)];

    const { getDb } = await import("@/lib/db");
    vi.mocked(getDb).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn(() => ({
            all: vi.fn(() => {
              // First day (2026-03-29): both slots taken; next day: empty
              const slots = callCount === 0
                ? [utcSlot("2026-03-29", 9), utcSlot("2026-03-29", 18)].map((s) => ({ scheduledAt: s }))
                : [];
              callCount++;
              return slots;
            }),
            get: vi.fn(() => null),
          })),
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn(() => ({
              get: vi.fn(() => ({ frequencyCap: null, defaultFrequencyCap: 3 })),
            })),
          }),
        }),
      }),
    }) as ReturnType<typeof getDb>);

    const { getNextSlot } = await import("@/lib/scheduling/next-slot");
    const result = await getNextSlot(1, "tiktok", new Date("2026-03-29T06:00:00.000Z"));
    expect(result.getUTCDate()).toBe(30);
    expect(result.getUTCHours()).toBe(9);
  });

  it("skips past slots (if current time is after 9am, next slot should be 6pm or later)", async () => {
    mockAllSlots = [];
    // 10am UTC — 9am slot is in the past
    vi.setSystemTime(new Date("2026-03-29T10:00:00.000Z"));
    const { getNextSlot } = await import("@/lib/scheduling/next-slot");
    const result = await getNextSlot(1, "tiktok", new Date("2026-03-29T10:00:00.000Z"));
    expect(result.getUTCHours()).toBe(18);
  });
});
