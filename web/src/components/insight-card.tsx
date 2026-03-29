import { cn } from "@/lib/utils";

interface InsightCardProps {
  title: string;
  body: string;
  type: "tip" | "warning" | "opportunity";
  confidence?: number;
}

const typeStyles: Record<InsightCardProps["type"], string> = {
  tip: "border-l-blue-500",
  warning: "border-l-amber-500",
  opportunity: "border-l-green-500",
};

const typeBadgeStyles: Record<InsightCardProps["type"], string> = {
  tip: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  opportunity: "bg-green-100 text-green-700",
};

export function InsightCard({ title, body, type, confidence }: InsightCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 bg-card p-4 shadow-sm",
        typeStyles[type]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-card-foreground">{title}</h3>
        {confidence !== undefined && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              typeBadgeStyles[type]
            )}
          >
            {Math.round(confidence * 100)}% confidence
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
