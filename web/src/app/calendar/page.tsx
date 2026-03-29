import Link from "next/link";
import { and, gte, lt } from "drizzle-orm";
import { type FC } from "react";
import { getDb } from "@/lib/db";
import { schedules } from "@/lib/db/schema";
import { CalendarWeek } from "@/components/calendar-week";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday … 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// WeekNav — uses only Next.js <Link>, no hooks, so no "use client" needed
// ---------------------------------------------------------------------------

interface WeekNavProps {
  prevWeek: string;
  nextWeek: string;
  label: string;
}

const WeekNav: FC<WeekNavProps> = ({ prevWeek, nextWeek, label }) => (
  <div className="flex items-center gap-4">
    <Link
      href={`?week=${prevWeek}`}
      className="rounded border px-3 py-1 text-sm hover:bg-muted"
    >
      ← Prev
    </Link>
    <span className="text-sm font-medium">{label}</span>
    <Link
      href={`?week=${nextWeek}`}
      className="rounded border px-3 py-1 text-sm hover:bg-muted"
    >
      Next →
    </Link>
  </div>
);

// ---------------------------------------------------------------------------
// Page — async Server Component
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const { week } = await searchParams;

  // Resolve weekStart to the Monday of the requested week
  let weekStart: Date;
  if (week) {
    const parsed = new Date(week);
    weekStart = isNaN(parsed.getTime()) ? getMondayOf(new Date()) : getMondayOf(parsed);
  } else {
    weekStart = getMondayOf(new Date());
  }

  const weekEnd = addDays(weekStart, 7); // exclusive upper bound (next Monday)

  // SQLite datetime strings: "YYYY-MM-DD HH:MM:SS"
  const weekStartStr = weekStart.toISOString().replace("T", " ").slice(0, 19);
  const weekEndStr = weekEnd.toISOString().replace("T", " ").slice(0, 19);

  // Query schedules in the 7-day window with joined post data
  const db = getDb();
  const rows = await db.query.schedules.findMany({
    where: and(
      gte(schedules.scheduledAt, weekStartStr),
      lt(schedules.scheduledAt, weekEndStr)
    ),
    with: {
      post: true,
    },
  });

  // Map to the shape expected by <CalendarWeek>
  const posts = rows.flatMap((r) => {
    if (!r.post) return [];
    const post = r.post;
    return [
      {
        id: r.id,
        scheduledAt: r.scheduledAt,
        platform: post.format ?? "unknown",
        title: post.caption?.slice(0, 60) ?? `Post #${r.postId}`,
        status: r.status,
      },
    ];
  });

  // Week navigation
  const prevWeek = toIso(addDays(weekStart, -7));
  const nextWeek = toIso(addDays(weekStart, 7));
  const weekEndDisplay = addDays(weekStart, 6);
  const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEndDisplay.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Calendar</h1>
        <WeekNav prevWeek={prevWeek} nextWeek={nextWeek} label={label} />
      </div>
      <CalendarWeek weekStart={weekStart} posts={posts} />
    </main>
  );
}
