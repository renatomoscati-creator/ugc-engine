import { getDb } from "@/lib/db";
import { schedules } from "@/lib/db/schema";
import { and, eq, like } from "drizzle-orm";
import { checkFrequencyCap } from "./frequency-cap";

const SLOT_HOURS = [9, 18]; // 9:00 AM and 6:00 PM (UTC)
const MAX_LOOKAHEAD_DAYS = 7;

function toUTCDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function slotDate(base: Date, utcHour: number): Date {
  const d = new Date(base);
  d.setUTCHours(utcHour, 0, 0, 0);
  return d;
}

export async function queryScheduledSlots(
  accountId: number,
  dateStr: string
): Promise<string[]> {
  const db = getDb();
  const rows = db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.accountId, accountId),
        like(schedules.scheduledAt, `${dateStr}%`)
      )
    )
    .all() as Array<{ scheduledAt: string }>;
  return rows.map((r) => r.scheduledAt);
}

/**
 * Returns the next available slot (9am or 6pm UTC) for the given account+platform,
 * starting from afterDate (defaults to now). Looks ahead up to 7 days.
 */
export async function getNextSlot(
  accountId: number,
  platform: string,
  afterDate?: Date
): Promise<Date> {
  const now = afterDate ?? new Date();

  for (let dayOffset = 0; dayOffset < MAX_LOOKAHEAD_DAYS; dayOffset++) {
    const dayBase = new Date(now);
    dayBase.setUTCDate(dayBase.getUTCDate() + dayOffset);

    const dateStr = toUTCDateString(dayBase);

    // Check frequency cap for this day
    const underCap = await checkFrequencyCap(accountId, platform, dateStr);
    if (!underCap) continue;

    // Get existing scheduled slot hours for this account on this day
    const existingSlotStrings = await queryScheduledSlots(accountId, dateStr);
    const takenHours = new Set(
      existingSlotStrings.map((s) => new Date(s).getUTCHours())
    );

    for (const hour of SLOT_HOURS) {
      const slot = slotDate(dayBase, hour);
      // Skip if in the past or at the same instant
      if (slot <= now) continue;
      // Skip if already taken
      if (takenHours.has(hour)) continue;
      return slot;
    }
  }

  throw new Error(
    `No available slot found within ${MAX_LOOKAHEAD_DAYS} days for accountId=${accountId}`
  );
}
