interface CalendarPost {
  id: number;
  title: string;
  platform: string;
  status: string;
  scheduledAt: string;
  color?: string;
}

interface CalendarWeekProps {
  weekStart: Date;
  posts: CalendarPost[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-pink-500",
  instagram: "bg-purple-500",
  youtube: "bg-red-500",
};

export function CalendarWeek({ weekStart, posts }: CalendarWeekProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const postsByDay = days.map((day) =>
    posts.filter((p) => {
      const d = new Date(p.scheduledAt);
      return d.toDateString() === day.toDateString();
    })
  );

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, i) => (
        <div key={i} className="min-h-[120px] rounded-lg border bg-card p-2">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {DAYS[i]} {day.getDate()}
          </div>
          <div className="flex flex-col gap-1">
            {postsByDay[i].length === 0 ? (
              <span className="text-xs text-muted-foreground/50">No posts</span>
            ) : (
              postsByDay[i].map((post) => (
                <div
                  key={post.id}
                  className={`rounded px-1.5 py-0.5 text-xs text-white ${post.color ?? PLATFORM_COLORS[post.platform] ?? "bg-zinc-600"}`}
                >
                  <span className="truncate block">{post.title}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
